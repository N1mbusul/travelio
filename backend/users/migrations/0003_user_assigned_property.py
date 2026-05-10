import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0005_remove_propertyimage_created_at_property_capacity"),
        ("users", "0002_translate_roles_to_english"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="assigned_property",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_receptionists",
                to="listings.property",
            ),
        ),
    ]
