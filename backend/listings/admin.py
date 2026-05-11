from django.contrib import admin

from .models import Property, Room, PropertyImage


class RoomInline(admin.TabularInline):
    model = Room
    extra = 0


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "city",
        "country",
        "owner",
        "property_type",
        "capacity",
        "created_at",
    ]
    list_filter = ["property_type", "country"]
    search_fields = ["name", "address", "city", "owner__username", "owner__email"]
    autocomplete_fields = ["owner"]
    inlines = [RoomInline, PropertyImageInline]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "property",
        "room_type",
        "capacity",
        "price_per_night",
        "availability_status",
    ]
    list_filter = ["availability_status"]
    search_fields = ["room_type", "property__name"]
    autocomplete_fields = ["property"]


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ["id", "property", "image"]
    autocomplete_fields = ["property"]
