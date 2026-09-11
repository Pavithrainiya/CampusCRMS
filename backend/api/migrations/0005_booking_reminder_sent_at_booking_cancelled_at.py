from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0004_booking_qr_code_booking_qr_code_data')]

    operations = [
        migrations.AddField(
            model_name='booking', name='reminder_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='booking', name='cancelled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='booking', name='status',
            field=models.CharField(choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected'), ('Cancelled', 'Cancelled')], default='Pending', max_length=10),
        ),
    ]
