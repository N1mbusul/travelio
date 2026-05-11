from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "property", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["user__username", "user__email", "property__name", "comment"]
    autocomplete_fields = ["user", "property"]
    readonly_fields = ["created_at"]
