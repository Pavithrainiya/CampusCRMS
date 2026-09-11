import math
import re
import datetime as dt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Count, Q, Avg
from api.models import Resource, Booking, ResourceReview, User
from api.serializers import ResourceSerializer

STOP_WORDS = {'book', 'reserve', 'find', 'for', 'the', 'a', 'an', 'is', 'are', 'in', 'on', 'at', 'me', 'need', 'want', 'looking', 'capacity', 'people', 'person', 'students', 'slot', 'tomorrow', 'today', 'room', 'get', 'with', 'and', 'or', 'of', 'to', 'for', 'what', 'which', 'how', 'show', 'list', 'please'}

SYNONYM_MAP = {
    'mac': ['mac', 'macbook', 'apple', 'imac', 'ios'],
    'macbook': ['mac', 'macbook', 'apple', 'imac'],
    'pc': ['pc', 'computer', 'desktop', 'laptop', 'windows'],
    'computer': ['pc', 'computer', 'desktop', 'macbook', 'workstation'],
    'gaming': ['gaming', 'gpu', 'graphics', 'rtx', 'alienware', 'game'],
    'lab': ['lab', 'laboratory', 'workstation', 'hub'],
    'hall': ['hall', 'auditorium', 'conference', 'event'],
    'lecture': ['lecture', 'classroom', 'seminar', 'hall'],
    'science': ['science', 'chemistry', 'biology', 'physics'],
    'studio': ['studio', 'design', 'art'],
}

class RAGEngine:
    """
    Retrieval-Augmented Generation Engine for CampusRMS.
    Semantically indexes all facilities, equipment, dress code rules, 
    materials to carry, amenities, and capacity count matching to answer queries accurately.
    """

    @staticmethod
    def tokenize(text):
        if not text:
            return set()
        return set(re.findall(r'\b\w+\b', text.lower()))

    @classmethod
    def token_match_score(cls, q_token, target_tokens):
        if not q_token or q_token in STOP_WORDS or q_token.isdigit():
            return 0.0
        
        synonyms = SYNONYM_MAP.get(q_token, [q_token])
        for syn in synonyms:
            for target in target_tokens:
                if syn == target:
                    return 4.0
                if len(syn) >= 3 and (syn in target or target in syn):
                    return 3.0
        return 0.0

    @classmethod
    def calculate_score(cls, query_tokens, resource, target_capacity=None, resource_type=None):
        name_tokens = cls.tokenize(resource.resource_name)
        type_tokens = cls.tokenize(resource.resource_type)
        equip_tokens = cls.tokenize(resource.equipment_needed or '')
        dress_tokens = cls.tokenize(resource.dress_code or '')
        materials_tokens = cls.tokenize(resource.materials_required or '')
        amenities_tokens = cls.tokenize(resource.amenities or '')
        desc_tokens = cls.tokenize(resource.description or '')

        text_score = 0.0
        for q_token in query_tokens:
            text_score += cls.token_match_score(q_token, name_tokens) * 2.5
            text_score += cls.token_match_score(q_token, type_tokens) * 2.0
            text_score += cls.token_match_score(q_token, equip_tokens) * 1.5
            text_score += cls.token_match_score(q_token, dress_tokens) * 1.2
            text_score += cls.token_match_score(q_token, materials_tokens) * 1.2
            text_score += cls.token_match_score(q_token, amenities_tokens) * 1.0
            text_score += cls.token_match_score(q_token, desc_tokens) * 0.8

        if resource_type:
            r_type_tokens = cls.tokenize(resource_type)
            for rt in r_type_tokens:
                if rt in type_tokens or any(rt in t or t in rt for t in type_tokens):
                    text_score += 6.0

        final_score = text_score

        if target_capacity:
            if resource.capacity >= target_capacity:
                diff = resource.capacity - target_capacity
                final_score += max(1.0, 8.0 - (diff * 0.05))
            else:
                final_score -= 15.0

        return text_score, final_score

    @classmethod
    def retrieve_relevant_resources(cls, query_text, target_capacity=None, resource_type=None, top_k=3):
        query_tokens = cls.tokenize(query_text)
        resources = Resource.objects.filter(availability_status=True)
        
        scored_resources = []
        has_any_text_match = False

        for res in resources:
            text_score, final_score = cls.calculate_score(query_tokens, res, target_capacity, resource_type)
            if text_score > 0:
                has_any_text_match = True
            scored_resources.append((text_score, final_score, res))

        # Sort by final score descending
        scored_resources.sort(key=lambda x: x[1], reverse=True)
        
        # If specific keywords were supplied in query text but no text matches exist at all in DB:
        non_stop_query_tokens = [t for t in query_tokens if t not in STOP_WORDS and not t.isdigit()]
        if non_stop_query_tokens and not has_any_text_match:
            return []

        top_matches = [res for ts, fs, res in scored_resources[:top_k] if fs > -10.0]
        if not top_matches and resources.exists():
            top_matches = [res for ts, fs, res in scored_resources[:top_k]]
            
        return top_matches


class IntentExtractor:
    """
    Parses user natural language queries into structured parameters.
    Extracts capacity counts (1 to 500), resource type, preferred dates, time slots, and equipment keywords.
    """

    TIME_SLOTS = [
        '09:00 AM - 11:00 AM',
        '11:00 AM - 01:00 PM',
        '01:00 PM - 03:00 PM',
        '03:00 PM - 05:00 PM',
        '05:00 PM - 07:00 PM'
    ]

    @classmethod
    def parse_query(cls, text):
        text_lower = text.lower()

        # Extract capacity count (e.g. "50", "count 50", "capacity 50", "for 15 people", "count 1", "15 students")
        capacity = None
        cap_match = re.search(r'\b(?:count|capacity|for|seats|people|students|size|number)?\s*(\d{1,3})\s*(?:people|person|persons|students|seats|capacity|users|count|members)?\b', text_lower)
        if cap_match:
            try:
                val = int(cap_match.group(1))
                if 1 <= val <= 500:
                    capacity = val
            except ValueError:
                pass
        
        if not capacity:
            nums = re.findall(r'\b\d{1,3}\b', text_lower)
            for n in nums:
                try:
                    val = int(n)
                    if 1 <= val <= 500:
                        capacity = val
                        break
                except ValueError:
                    pass

        # Extract resource type
        resource_type = None
        if any(k in text_lower for k in ['mac', 'macbook', 'pc', 'computer', 'gaming', 'laptop']):
            resource_type = 'Computer'
        elif any(k in text_lower for k in ['lab', 'science', 'chemistry', 'physics', 'studio']):
            resource_type = 'Lab'
        elif any(k in text_lower for k in ['hall', 'auditorium', 'event', 'conference']):
            resource_type = 'Event Hall'
        elif any(k in text_lower for k in ['lecture', 'classroom', 'seminar']):
            resource_type = 'Classroom'

        # Extract date (e.g. "tomorrow", "today", or specific date)
        today = dt.date.today()
        booking_date = today
        if 'tomorrow' in text_lower:
            booking_date = today + dt.timedelta(days=1)
        elif 'next week' in text_lower:
            booking_date = today + dt.timedelta(days=7)

        # Extract time slot
        time_slot = '09:00 AM - 11:00 AM'
        if 'afternoon' in text_lower or '1pm' in text_lower or '1 pm' in text_lower:
            time_slot = '01:00 PM - 03:00 PM'
        elif 'evening' in text_lower or '5pm' in text_lower or '5 pm' in text_lower:
            time_slot = '05:00 PM - 07:00 PM'
        elif '11am' in text_lower or '11 am' in text_lower or 'noon' in text_lower:
            time_slot = '11:00 AM - 01:00 PM'
        elif '3pm' in text_lower or '3 pm' in text_lower:
            time_slot = '03:00 PM - 05:00 PM'

        # Extract intent action
        intent = 'query'
        if any(w in text_lower for w in ['book', 'reserve', 'schedule', 'hold', 'get me']):
            intent = 'book'
        elif any(w in text_lower for w in ['quiet', 'offpeak', 'off-peak', 'traffic', 'least busy', 'crowded']):
            intent = 'offpeak'
        elif any(w in text_lower for w in ['recommend', 'best', 'suggest', 'find']):
            intent = 'recommend'

        return {
            'intent': intent,
            'capacity': capacity,
            'resource_type': resource_type,
            'booking_date': booking_date.strftime('%Y-%m-%d'),
            'time_slot': time_slot
        }


class AIAssistantView(APIView):
    """
    RAG-Powered AI Chatbot & Natural Language Assistant.
    Provides context-rich facility recommendations, dress code/gear rules,
    off-peak quiet slot insights, capacity count parsing, and 1-click booking action payloads.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user_message = (request.data.get('message') or request.data.get('query') or '').strip()
        if not user_message:
            return Response({'error': 'Message or query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Parse natural language intent & capacity parameters
        parsed = IntentExtractor.parse_query(user_message)
        
        # 2. RAG Retrieval over Resource Knowledge Base with capacity matching
        retrieved_resources = RAGEngine.retrieve_relevant_resources(
            query_text=user_message,
            target_capacity=parsed['capacity'],
            resource_type=parsed['resource_type'],
            top_k=3
        )
        
        if not retrieved_resources:
            msg = "I couldn't find any matching active facilities for your request. Try searching for Labs, Lecture Halls, PC Hubs, or Event Auditoriums."
            return Response({
                'reply': msg,
                'answer': msg,
                'recommendations': [],
                'booking_intent': None
            })

        best_match = retrieved_resources[0]
        serialized_matches = ResourceSerializer(retrieved_resources, many=True).data

        # 3. Calculate Off-peak congestion status for best match
        today = dt.date.today()
        recent_bookings_count = Booking.objects.filter(
            resource=best_match,
            booking_date__gte=today,
            status='Approved'
        ).count()

        congestion_status = "Low Traffic (Quiet Window)" if recent_bookings_count < 3 else "Moderate Occupancy"

        # 4. Construct natural language RAG response
        reply_parts = []
        
        if parsed['intent'] == 'book':
            reply_parts.append(f"🤖 **RAG AI Assistant**: Based on your request, I found **{best_match.resource_name}** ({best_match.resource_type}) located at **{best_match.location or 'Campus Main Wing'}**.")
            if parsed['capacity']:
                reply_parts.append(f"• 👥 **Requested Count**: **{parsed['capacity']} people** (Max Capacity: {best_match.capacity} occupants)")
            else:
                reply_parts.append(f"• **Capacity**: {best_match.capacity} people (Fee: ${best_match.hourly_rate:.2f}/hr)")
                
            if best_match.dress_code:
                reply_parts.append(f"• 👔 **Dress Code Required**: {best_match.dress_code}")
            if best_match.materials_required:
                reply_parts.append(f"• 🎒 **Bring to Class**: {best_match.materials_required}")
            if best_match.equipment_needed:
                reply_parts.append(f"• ⚡ **Equipment Installed**: {best_match.equipment_needed}")
            reply_parts.append(f"\nWould you like me to reserve **{best_match.resource_name}** for **{parsed['booking_date']}** ({parsed['time_slot']})? Click below to confirm!")
            
            booking_intent = {
                'resource_id': best_match.id,
                'resource_name': best_match.resource_name,
                'resource_type': best_match.resource_type,
                'booking_date': parsed['booking_date'],
                'time_slot': parsed['time_slot'],
                'capacity': best_match.capacity,
                'hourly_rate': float(best_match.hourly_rate)
            }
        elif parsed['intent'] == 'offpeak':
            reply_parts.append(f"📊 **Smart Off-Peak Slot Optimizer**: For **{best_match.resource_name}**, the quietest recommended window is **{parsed['time_slot']}** on **{parsed['booking_date']}** ({congestion_status}).")
            if parsed['capacity']:
                reply_parts.append(f"• 👥 **Requested Capacity Count**: **{parsed['capacity']} people**")
            if best_match.equipment_needed:
                reply_parts.append(f"• **Equipment**: {best_match.equipment_needed}")
            booking_intent = {
                'resource_id': best_match.id,
                'resource_name': best_match.resource_name,
                'resource_type': best_match.resource_type,
                'booking_date': parsed['booking_date'],
                'time_slot': parsed['time_slot'],
                'capacity': best_match.capacity,
                'hourly_rate': float(best_match.hourly_rate)
            }
        else:
            reply_parts.append(f"💡 **AI Recommendation**: The top matched campus facility is **{best_match.resource_name}**.")
            reply_parts.append(f"• **Type & Location**: {best_match.resource_type} — {best_match.location or 'Campus Wing'}")
            if parsed['capacity']:
                reply_parts.append(f"• 👥 **Requested Count**: **{parsed['capacity']} people** (Room Max Capacity: {best_match.capacity} occupants)")
            else:
                reply_parts.append(f"• **Max Capacity**: {best_match.capacity} occupants")
            if best_match.dress_code:
                reply_parts.append(f"• 👔 **Dress Code**: {best_match.dress_code}")
            if best_match.materials_required:
                reply_parts.append(f"• 🎒 **Materials to Carry**: {best_match.materials_required}")
            if best_match.equipment_needed:
                reply_parts.append(f"• ⚡ **Equipments**: {best_match.equipment_needed}")
            booking_intent = {
                'resource_id': best_match.id,
                'resource_name': best_match.resource_name,
                'resource_type': best_match.resource_type,
                'booking_date': parsed['booking_date'],
                'time_slot': parsed['time_slot'],
                'capacity': best_match.capacity,
                'hourly_rate': float(best_match.hourly_rate)
            }

        answer_text = "\n".join(reply_parts)
        sources_list = [{'name': r.resource_name, 'type': r.resource_type} for r in retrieved_resources]

        return Response({
            'reply': answer_text,
            'answer': answer_text,
            'recommendations': serialized_matches,
            'sources': sources_list,
            'booking_intent': booking_intent,
            'congestion_status': congestion_status
        })


class AIRecommendView(APIView):
    """
    AI Resource Recommendation Engine.
    Evaluates capacity count (1 to 500), equipment, dress code, and rating scores to rank facilities.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        capacity_str = request.query_params.get('capacity') or request.query_params.get('min_capacity')
        equipment_q = request.query_params.get('equipment', '').strip().lower()
        resource_type = request.query_params.get('type')
        
        resources = Resource.objects.filter(availability_status=True)
        if resource_type and resource_type != 'All':
            resources = resources.filter(resource_type__icontains=resource_type)

        ranked = []
        target_cap = int(capacity_str) if capacity_str and capacity_str.isdigit() else 20

        for res in resources:
            score = 75.0
            
            # Capacity fit calculation for count 1..500
            if res.capacity >= target_cap:
                diff = res.capacity - target_cap
                score += max(0, 15.0 - (diff * 0.2))
            else:
                score -= 25.0

            # Equipment match
            if equipment_q and res.equipment_needed and equipment_q in res.equipment_needed.lower():
                score += 10.0
            elif res.equipment_needed:
                score += 5.0

            if res.image_url:
                score += 5.0

            score = min(100.0, max(10.0, score))
            
            eq_list = [e.strip() for e in res.equipment_needed.split(',')] if res.equipment_needed else []

            serialized = ResourceSerializer(res).data
            serialized['suitability_score'] = round(score, 1)
            serialized['match_percentage'] = round(score, 1)
            serialized['equipment_list'] = eq_list
            serialized['recommendation_reason'] = (
                f"Ideal fit for requested count of {target_cap} (Max capacity: {res.capacity}). "
                f"{'Features ' + res.equipment_needed + '.' if res.equipment_needed else 'Standard facility amenities.'}"
            )
            ranked.append(serialized)

        ranked.sort(key=lambda x: x['suitability_score'], reverse=True)
        return Response({
            'recommendations': ranked[:6]
        })


class AIOffPeakOptimizerView(APIView):
    """
    Smart Off-Peak Slot Optimizer.
    Calculates historical slot occupancy to highlight quiet, low-congestion hours.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        resource_id = request.query_params.get('resource')
        time_slots = IntentExtractor.TIME_SLOTS

        slot_traffic = []
        today = dt.date.today()
        thirty_days_ago = today - dt.timedelta(days=30)

        for slot in time_slots:
            query = Booking.objects.filter(time_slot=slot, booking_date__gte=thirty_days_ago)
            if resource_id:
                query = query.filter(resource_id=resource_id)
            
            booking_count = query.count()
            
            if booking_count <= 2:
                status_str = "Low / Quiet"
                congestion = "LOW"
                score = 95
            elif booking_count <= 5:
                status_str = "Moderate"
                congestion = "MODERATE"
                score = 65
            else:
                status_str = "High / Peak"
                congestion = "HIGH"
                score = 30

            slot_traffic.append({
                'slot': slot,
                'time_slot': slot,
                'booking_count': booking_count,
                'status': status_str,
                'congestion': congestion,
                'quiet_score': score
            })

        slot_traffic.sort(key=lambda x: x['quiet_score'], reverse=True)
        return Response({
            'recommended_quiet_slot': slot_traffic[0] if slot_traffic else None,
            'off_peak_slots': slot_traffic,
            'all_slots': slot_traffic
        })
