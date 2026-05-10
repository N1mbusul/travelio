from django.urls import path

from .views import (
    MyPropertyListView,
    PropertyDetailView,
    PropertyListCreateView,
    PropertyReceptionistAssignmentView,
    PropertyRoomListCreateView,
    RoomDetailView,
)

urlpatterns = [
    path("my-properties/", MyPropertyListView.as_view(), name="my-properties"),
    path(
        "properties/<int:pk>/receptionist/",
        PropertyReceptionistAssignmentView.as_view(),
        name="property-receptionist",
    ),
    path(
        "properties/<int:property_pk>/rooms/",
        PropertyRoomListCreateView.as_view(),
        name="property-rooms",
    ),
    path("rooms/<int:pk>/", RoomDetailView.as_view(), name="room-detail"),
    path("properties/", PropertyListCreateView.as_view(), name="property-list-create"),
    path("properties/<int:pk>/", PropertyDetailView.as_view(), name="property-detail"),
]
