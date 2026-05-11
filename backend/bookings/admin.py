from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "room",
        "check_in_date",
        "check_out_date",
        "booking_status",
        "total_price",
        "created_at",
    ]
    list_filter = ["booking_status", "created_at"]
    search_fields = [
        "user__username",
        "user__email",
        "room__property__name",
        "room__room_type",
    ]
    autocomplete_fields = ["user", "room"]
    readonly_fields = ["created_at"]
