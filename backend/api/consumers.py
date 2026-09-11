import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        query = parse_qs(self.scope['query_string'].decode())
        token = query.get('token', [None])[0]
        try:
            token_user_id = AccessToken(token)['user_id']
        except Exception:
            await self.close(code=4401)
            return
        if str(token_user_id) != str(self.user_id):
            await self.close(code=4403)
            return
        self.room_group_name = f'notifications_{self.user_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        # Notifications are server-originated; clients cannot broadcast into a user room.
        return

    # Receive message from room group
    async def notification_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
