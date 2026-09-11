# Requirements Document

## Introduction

This document specifies requirements for three high-impact features to enhance the CampusRMS (Campus Resource Management System): Advanced Analytics Dashboard, Smart Search & Recommendations, and Enhanced Automatic Cancellation & Reminders. These features aim to provide actionable insights through data analytics, improve user experience through intelligent search and recommendations, and reduce no-shows through automated notifications and cancellations.

The CampusRMS system is a Django REST Framework backend with React frontend that manages resource bookings for educational institutions. The system currently supports email notifications, QR code check-ins, calendar views, real-time WebSocket notifications, and basic dashboards.

## Glossary

- **Analytics_System**: The subsystem responsible for computing statistics, generating visualizations, and producing reports
- **Search_Engine**: The subsystem that processes search queries and returns filtered, ranked results
- **Recommendation_Engine**: The subsystem that suggests resources based on user behavior and booking patterns
- **Auto_Cancellation_Service**: The background service that monitors bookings and cancels them based on check-in rules
- **Reminder_Service**: The background service that sends notifications before scheduled bookings
- **Heatmap**: A visual representation showing booking intensity across time periods
- **Utilization_Rate**: The percentage of time a resource is occupied versus its total available time
- **No_Show**: An approved booking where the user did not check in within the allowed time window
- **Grace_Period**: The time window after booking start time during which check-in is still accepted
- **Check_In**: The action of confirming physical presence at a booked resource
- **Booking_Extension**: A request to lengthen an existing booking beyond its original end time
- **Collaborative_Filtering**: A recommendation technique based on patterns of similar users' bookings
- **Peak_Hours**: Time periods with the highest booking density
- **Admin_User**: A user with role='Admin' who has full system access
- **Staff_User**: A user with role='Staff' who can manage resources and view analytics
- **Student_User**: A user with role='Student' who can book resources
- **Report**: A formatted document (PDF or Excel) containing analytics data

## Requirements

### Requirement 1: Advanced Analytics Dashboard

**User Story:** As an Admin_User, I want to view comprehensive analytics about resource usage, so that I can make data-driven decisions about resource allocation and identify usage patterns.

#### Acceptance Criteria

1. WHEN an Admin_User or Staff_User requests the analytics dashboard, THE Analytics_System SHALL compute and display utilization rates for all resources
2. WHEN computing utilization rate, THE Analytics_System SHALL calculate the percentage as (total booked hours / total available hours) * 100 for each resource
3. WHEN an Admin_User or Staff_User requests a heatmap, THE Analytics_System SHALL generate a visualization showing booking counts for each hour of the day across each day of the week
4. WHEN displaying popular resources, THE Analytics_System SHALL rank resources by total booking count in descending order
5. WHEN calculating no-show rate, THE Analytics_System SHALL compute the percentage as (approved bookings without check-in / total approved bookings) * 100
6. WHEN an Admin_User requests user booking patterns, THE Analytics_System SHALL display booking frequency grouped by user role and time periods
7. WHEN a Student_User requests analytics, THE Analytics_System SHALL return an access denied error
8. WHERE export format is PDF, WHEN an Admin_User requests a report export, THE Analytics_System SHALL generate a PDF document containing all analytics data
9. WHERE export format is Excel, WHEN an Admin_User requests a report export, THE Analytics_System SHALL generate an Excel spreadsheet with separate sheets for each analytics category
10. WHEN generating reports, THE Analytics_System SHALL include the report generation timestamp and date range filter applied

### Requirement 2: Peak Usage Hours Heatmap Visualization

**User Story:** As an Admin_User, I want to see a heatmap of peak usage hours, so that I can identify when resources are most in demand and optimize scheduling.

#### Acceptance Criteria

1. THE Analytics_System SHALL generate heatmap data with time slots (hours 0-23) on one axis and days of the week on the other axis
2. WHEN computing heatmap values, THE Analytics_System SHALL count the number of bookings for each hour-day combination
3. THE Analytics_System SHALL normalize heatmap values to a scale of 0 to 100 for consistent color representation
4. WHEN rendering the heatmap, THE Frontend_Application SHALL use color intensity to represent booking density (lighter = fewer bookings, darker = more bookings)
5. WHEN a user hovers over a heatmap cell, THE Frontend_Application SHALL display the exact booking count for that time slot
6. WHERE a date range filter is applied, THE Analytics_System SHALL compute heatmap data only for bookings within the specified date range
7. THE Analytics_System SHALL support date range filters of last 7 days, last 30 days, last 90 days, and custom date range

### Requirement 3: Resource Utilization Rate Calculation

**User Story:** As an Admin_User, I want to see utilization rates for each resource, so that I can identify underutilized or overutilized resources.

#### Acceptance Criteria

1. THE Analytics_System SHALL calculate available hours as (operating hours per day) * (number of days in analysis period) for each resource
2. THE Analytics_System SHALL calculate booked hours by summing the duration of all approved bookings within the analysis period
3. THE Analytics_System SHALL compute utilization rate as (booked hours / available hours) * 100
4. WHERE operating hours are not configured, THE Analytics_System SHALL assume 12 hours per day (8 AM to 8 PM) and 7 days per week
5. THE Analytics_System SHALL display utilization rates as percentages with one decimal precision
6. WHEN displaying utilization rates, THE Analytics_System SHALL sort resources from highest to lowest utilization
7. THE Analytics_System SHALL highlight resources with utilization rate above 80 percent as high utilization
8. THE Analytics_System SHALL highlight resources with utilization rate below 20 percent as low utilization

### Requirement 4: No-Show Rate Tracking

**User Story:** As an Admin_User, I want to track no-show rates, so that I can identify patterns of missed bookings and take corrective actions.

#### Acceptance Criteria

1. THE Analytics_System SHALL identify a booking as a no-show IF the booking status is Approved AND the booking date is in the past AND checked_in is False
2. THE Analytics_System SHALL calculate overall no-show rate as (total no-shows / total approved bookings) * 100
3. THE Analytics_System SHALL calculate per-resource no-show rate for each resource separately
4. THE Analytics_System SHALL calculate per-user no-show rate for each user separately
5. WHEN displaying no-show statistics, THE Analytics_System SHALL include total no-shows count, no-show rate percentage, and comparison with previous period
6. THE Analytics_System SHALL support filtering no-show data by date range, resource type, and user role
7. WHEN a user has a no-show rate above 30 percent, THE Analytics_System SHALL flag that user as high-risk in the analytics display

### Requirement 5: Multi-Criteria Resource Search

**User Story:** As a Student_User, I want to search for resources using multiple criteria, so that I can find resources that meet my specific needs.

#### Acceptance Criteria

1. THE Search_Engine SHALL accept search parameters for resource_name, resource_type, location, amenities, and capacity
2. WHEN a Student_User provides a resource_name search term, THE Search_Engine SHALL return resources where resource_name contains the search term (case-insensitive)
3. WHEN a Student_User provides a resource_type filter, THE Search_Engine SHALL return only resources matching that resource_type exactly
4. WHEN a Student_User provides a location search term, THE Search_Engine SHALL return resources where location contains the search term (case-insensitive)
5. WHEN a Student_User provides an amenities search term, THE Search_Engine SHALL return resources where amenities field contains the search term (case-insensitive)
6. WHEN a Student_User provides a minimum capacity value, THE Search_Engine SHALL return only resources where capacity is greater than or equal to the specified value
7. WHEN multiple search criteria are provided, THE Search_Engine SHALL return only resources matching all criteria (AND logic)
8. WHEN a Student_User provides an availability filter set to true, THE Search_Engine SHALL return only resources where availability_status is True
9. THE Search_Engine SHALL return results within 500 milliseconds for queries on datasets up to 10000 resources

### Requirement 6: Autocomplete Search Suggestions

**User Story:** As a Student_User, I want to see autocomplete suggestions while typing in the search box, so that I can quickly find resources without typing the full name.

#### Acceptance Criteria

1. WHEN a Student_User types at least 2 characters in the search box, THE Search_Engine SHALL return up to 10 matching suggestions
2. THE Search_Engine SHALL match suggestions against resource_name, resource_type, and location fields
3. THE Search_Engine SHALL return suggestions ranked by relevance (exact prefix match first, then substring matches)
4. THE Search_Engine SHALL debounce search requests to wait 300 milliseconds after the user stops typing
5. WHEN the user selects a suggestion, THE Frontend_Application SHALL populate the search field and execute the full search
6. THE Search_Engine SHALL include the resource_type in each suggestion for disambiguation
7. WHEN network latency is high, THE Frontend_Application SHALL display a loading indicator for suggestions

### Requirement 7: Resource Recommendations

**User Story:** As a Student_User, I want to see recommended resources similar to ones I have booked, so that I can discover relevant alternatives.

#### Acceptance Criteria

1. WHEN a Student_User views a resource detail page, THE Recommendation_Engine SHALL display up to 5 recommended resources
2. THE Recommendation_Engine SHALL recommend resources with the same resource_type as the viewed resource
3. WHEN calculating recommendations, THE Recommendation_Engine SHALL prioritize resources that have been booked by users who also booked the viewed resource
4. THE Recommendation_Engine SHALL exclude the currently viewed resource from recommendations
5. THE Recommendation_Engine SHALL exclude resources where availability_status is False from recommendations
6. WHERE sufficient booking history exists, THE Recommendation_Engine SHALL use collaborative filtering based on user-item booking matrix
7. WHERE insufficient booking history exists, THE Recommendation_Engine SHALL fall back to content-based recommendations using resource_type and amenities similarity
8. THE Recommendation_Engine SHALL compute recommendations within 1 second for individual resource queries

### Requirement 8: Enhanced Automatic Cancellation with Grace Period

**User Story:** As an Admin_User, I want the system to automatically cancel bookings when users fail to check in, so that resources become available for others.

#### Acceptance Criteria

1. THE Auto_Cancellation_Service SHALL check for eligible cancellations every 5 minutes
2. WHEN a booking has status Approved AND the current time is more than Grace_Period minutes after the booking start time AND checked_in is False, THE Auto_Cancellation_Service SHALL change the booking status to Rejected
3. WHERE Grace_Period is not configured, THE Auto_Cancellation_Service SHALL use a default value of 15 minutes
4. WHEN a booking is auto-cancelled, THE Auto_Cancellation_Service SHALL create a Notification record with message indicating automatic cancellation due to no check-in
5. WHEN a booking is auto-cancelled, THE Auto_Cancellation_Service SHALL send an email notification to the booking user
6. THE Auto_Cancellation_Service SHALL log each auto-cancellation action in the AuditLog with action description including booking ID and reason
7. THE Auto_Cancellation_Service SHALL parse the time_slot field to extract booking start time for comparison
8. WHERE time_slot format is invalid, THE Auto_Cancellation_Service SHALL skip that booking and log a warning

### Requirement 9: Configurable Grace Period Settings

**User Story:** As an Admin_User, I want to configure the grace period for auto-cancellation, so that I can adjust the policy based on institutional needs.

#### Acceptance Criteria

1. THE Admin_Settings_Interface SHALL provide a field to set Grace_Period value in minutes
2. THE Admin_Settings_Interface SHALL validate that Grace_Period is a positive integer between 1 and 60 minutes
3. WHEN an Admin_User updates the Grace_Period setting, THE System SHALL persist the new value to the database
4. THE Auto_Cancellation_Service SHALL read the current Grace_Period value from the database on each execution cycle
5. THE Admin_Settings_Interface SHALL display the currently configured Grace_Period value
6. WHERE Grace_Period is not set, THE Admin_Settings_Interface SHALL show the default value of 15 minutes
7. WHEN a non-Admin_User attempts to modify Grace_Period, THE System SHALL return an authorization error

### Requirement 10: Booking Extension Request

**User Story:** As a Student_User, I want to request an extension for my booking, so that I can continue using a resource beyond my originally scheduled time.

#### Acceptance Criteria

1. WHEN a Student_User has an approved booking AND the current time is within the booking time slot, THE Frontend_Application SHALL display an "Request Extension" button
2. WHEN a Student_User clicks "Request Extension", THE Frontend_Application SHALL prompt for extension duration in 30-minute increments
3. WHEN a Student_User submits an extension request, THE System SHALL create an Extension_Request record with status Pending
4. THE System SHALL validate that the requested extension time slot is not already booked for the same resource
5. WHEN extension time is available, THE System SHALL notify Admin_Users of the pending extension request
6. WHEN an Admin_User approves an extension request, THE System SHALL update the booking time_slot to include the extended time
7. WHEN an Admin_User rejects an extension request, THE System SHALL notify the Student_User of the rejection
8. THE System SHALL allow only one pending extension request per booking at a time

### Requirement 11: Enhanced Reminder Service Activation

**User Story:** As a Student_User, I want to receive reminders before my bookings, so that I do not forget to attend.

#### Acceptance Criteria

1. THE Reminder_Service SHALL execute every 10 minutes to check for upcoming bookings
2. WHEN a booking has status Approved AND the booking date is today AND the booking start time is within 60 minutes AND checked_in is False AND reminder_sent is False, THE Reminder_Service SHALL send a reminder
3. WHEN sending a reminder, THE Reminder_Service SHALL create a Notification record for the user
4. WHEN sending a reminder, THE Reminder_Service SHALL send an email to the user email address
5. WHEN sending a reminder, THE Reminder_Service SHALL send a real-time WebSocket notification to the user
6. THE Reminder_Service SHALL mark the booking with reminder_sent set to True after sending the reminder
7. THE Reminder_Service SHALL parse time_slot to extract start time for calculating time until booking
8. WHERE time_slot parsing fails, THE Reminder_Service SHALL skip that booking and log an error

### Requirement 12: Report Export with PDF Generation

**User Story:** As an Admin_User, I want to export analytics reports as PDF, so that I can share insights with stakeholders in a professional format.

#### Acceptance Criteria

1. WHEN an Admin_User requests a PDF export, THE Analytics_System SHALL generate a PDF document using ReportLab library
2. THE Analytics_System SHALL include a title page with report name, generation date, and date range
3. THE Analytics_System SHALL include sections for utilization rates, peak usage heatmap description, popular resources, and no-show statistics
4. THE Analytics_System SHALL render utilization rate data as a table with resource name and percentage columns
5. THE Analytics_System SHALL render popular resources as a ranked list with booking counts
6. THE Analytics_System SHALL render no-show statistics with overall rate and per-resource breakdown
7. WHEN generating PDF, THE Analytics_System SHALL embed chart images for visual data representations
8. THE Analytics_System SHALL return the PDF file with Content-Disposition header set to attachment with filename containing the generation date

### Requirement 13: Report Export with Excel Generation

**User Story:** As an Admin_User, I want to export analytics reports as Excel spreadsheets, so that I can perform further analysis and calculations.

#### Acceptance Criteria

1. WHEN an Admin_User requests an Excel export, THE Analytics_System SHALL generate an Excel workbook using openpyxl library
2. THE Analytics_System SHALL create separate worksheets named "Summary", "Utilization", "Popular Resources", "No-Shows", and "Heatmap Data"
3. THE Summary worksheet SHALL include report metadata (generation date, date range, total resources, total bookings)
4. THE Utilization worksheet SHALL include columns for resource ID, resource name, resource type, booked hours, available hours, and utilization percentage
5. THE Popular_Resources worksheet SHALL include columns for rank, resource name, resource type, and total bookings
6. THE No_Shows worksheet SHALL include columns for resource name, total approved bookings, no-shows count, and no-show rate percentage
7. THE Heatmap_Data worksheet SHALL include hour rows and day-of-week columns with booking counts in each cell
8. THE Analytics_System SHALL format percentage columns to display as percentages with one decimal place
9. THE Analytics_System SHALL return the Excel file with Content-Disposition header set to attachment with filename containing the generation date

### Requirement 14: Search Result Ranking

**User Story:** As a Student_User, I want search results ranked by relevance and availability, so that the most useful resources appear first.

#### Acceptance Criteria

1. WHEN returning search results, THE Search_Engine SHALL rank resources using a composite score
2. THE Search_Engine SHALL calculate a popularity score based on total booking count for each resource
3. THE Search_Engine SHALL calculate a relevance score based on how many search criteria fields match the search terms
4. THE Search_Engine SHALL calculate an availability score with value 1.0 for available resources and 0.5 for unavailable resources
5. THE Search_Engine SHALL compute the final ranking score as (relevance_score * 0.5) + (popularity_score_normalized * 0.3) + (availability_score * 0.2)
6. THE Search_Engine SHALL normalize popularity scores to a 0-1 scale using min-max normalization
7. THE Search_Engine SHALL return results sorted by final ranking score in descending order
8. WHERE two resources have identical ranking scores, THE Search_Engine SHALL use alphabetical order by resource_name as a tiebreaker

### Requirement 15: Time Slot Parser

**User Story:** As a System Developer, I want a reliable time slot parser, so that automated services can correctly extract start and end times from booking time slots.

#### Acceptance Criteria

1. THE Time_Parser SHALL accept time_slot strings in the format "HH:MM AM/PM - HH:MM AM/PM"
2. THE Time_Parser SHALL extract and return start_time and end_time as datetime.time objects
3. WHEN the time_slot string does not match the expected format, THE Time_Parser SHALL raise a ValueError with a descriptive error message
4. THE Time_Parser SHALL handle both 12-hour format with AM/PM designators
5. THE Time_Parser SHALL validate that end_time is later than start_time
6. WHERE end_time is before start_time, THE Time_Parser SHALL raise a ValueError indicating invalid time range
7. THE Time_Parser SHALL strip whitespace from input before parsing
8. THE Time_Parser SHALL be used by Auto_Cancellation_Service and Reminder_Service for all time slot processing

### Requirement 16: Collaborative Filtering Recommendation Model

**User Story:** As a Student_User, I want to see resources recommended based on what similar users booked, so that I can discover resources that match my needs.

#### Acceptance Criteria

1. THE Recommendation_Engine SHALL construct a user-resource booking matrix from historical booking data
2. THE Recommendation_Engine SHALL use cosine similarity to measure similarity between users based on their booking patterns
3. WHEN computing recommendations for a target user, THE Recommendation_Engine SHALL identify the top 10 most similar users
4. THE Recommendation_Engine SHALL aggregate resources booked by similar users that the target user has not booked
5. THE Recommendation_Engine SHALL rank recommended resources by weighted booking frequency from similar users
6. WHERE a user has fewer than 3 bookings, THE Recommendation_Engine SHALL skip collaborative filtering and use content-based recommendations only
7. THE Recommendation_Engine SHALL update the user-resource matrix once per day during off-peak hours
8. THE Recommendation_Engine SHALL cache computed similarities to improve recommendation response time

### Requirement 17: Analytics Date Range Filtering

**User Story:** As an Admin_User, I want to filter analytics by date range, so that I can analyze trends over specific time periods.

#### Acceptance Criteria

1. THE Analytics_System SHALL accept start_date and end_date parameters in ISO 8601 format (YYYY-MM-DD)
2. WHEN both start_date and end_date are provided, THE Analytics_System SHALL include only bookings where booking_date is between start_date and end_date inclusive
3. WHEN only start_date is provided, THE Analytics_System SHALL include bookings from start_date to the current date
4. WHEN only end_date is provided, THE Analytics_System SHALL include bookings from the earliest booking date to end_date
5. WHEN neither start_date nor end_date is provided, THE Analytics_System SHALL default to the last 30 days
6. THE Analytics_System SHALL validate that start_date is not later than end_date
7. WHERE start_date is after end_date, THE Analytics_System SHALL return a validation error with descriptive message
8. THE Frontend_Application SHALL provide preset date range options: Last 7 Days, Last 30 Days, Last 90 Days, This Year, and Custom Range

### Requirement 18: Real-Time Analytics Updates

**User Story:** As an Admin_User viewing the analytics dashboard, I want to see updated statistics without manual refresh, so that I can monitor resource usage in real-time.

#### Acceptance Criteria

1. WHEN an Admin_User is viewing the analytics dashboard, THE Frontend_Application SHALL poll the analytics API every 60 seconds
2. WHEN new analytics data is received, THE Frontend_Application SHALL update the displayed statistics smoothly without full page reload
3. THE Frontend_Application SHALL display a timestamp showing when the analytics data was last updated
4. WHEN the polling request fails, THE Frontend_Application SHALL retry after 30 seconds
5. WHEN the polling request fails 3 consecutive times, THE Frontend_Application SHALL display an error message and stop polling
6. THE Frontend_Application SHALL resume polling when the user manually clicks a "Refresh" button
7. WHEN the user navigates away from the analytics dashboard, THE Frontend_Application SHALL stop polling to conserve resources

### Requirement 19: Booking History Data Model Extension

**User Story:** As a System Developer, I want to track reminder and extension status in the booking model, so that automated services have the data needed for their logic.

#### Acceptance Criteria

1. THE Booking model SHALL include a reminder_sent boolean field with default value False
2. THE Booking model SHALL include an auto_cancelled boolean field with default value False
3. THE Booking model SHALL include an auto_cancel_reason text field allowing null values
4. THE System SHALL add an Extension_Request model with fields: booking (foreign key), requested_duration_minutes (integer), status (Pending/Approved/Rejected), requested_at (datetime), and resolved_at (datetime)
5. WHEN a booking is auto-cancelled, THE Auto_Cancellation_Service SHALL set auto_cancelled to True and populate auto_cancel_reason
6. WHEN the Reminder_Service sends a reminder, THE Reminder_Service SHALL set reminder_sent to True
7. THE System SHALL create database migrations for the new fields and model
8. THE System SHALL ensure backward compatibility by setting default values for existing bookings

### Requirement 20: Performance Optimization for Large Datasets

**User Story:** As a System Administrator, I want the analytics system to perform efficiently with large datasets, so that dashboard load times remain acceptable as data grows.

#### Acceptance Criteria

1. THE Analytics_System SHALL use database indexes on booking_date, status, and checked_in fields for the Booking model
2. THE Analytics_System SHALL use database aggregation functions (COUNT, SUM, AVG) rather than loading all records into Python
3. WHEN computing utilization rates, THE Analytics_System SHALL use a single query with GROUP BY resource_id
4. WHEN generating heatmap data, THE Analytics_System SHALL use database date/time extraction functions and aggregation
5. THE Analytics_System SHALL implement query result caching with 5-minute expiration for analytics endpoints
6. THE Analytics_System SHALL return analytics data within 3 seconds for datasets up to 100000 bookings
7. WHERE query execution exceeds 3 seconds, THE Analytics_System SHALL log a performance warning with query details
8. THE System SHALL provide database query optimization recommendations in deployment documentation
