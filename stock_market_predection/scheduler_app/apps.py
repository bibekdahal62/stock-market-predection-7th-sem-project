import os
import atexit
from django.apps import AppConfig
from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings


class SchedulerAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scheduler_app'

    def ready(self):
        from stock_data.tasks import store_data
        from prediction.tasks import scheduled_prediction_task

        if settings.DEBUG:
            if os.environ.get('RUN_MAIN') != 'true':
                return

        scheduler = BackgroundScheduler(timezone='Asia/Kathmandu')  # Set your timezone
        scheduler.add_job(store_data, 'interval', minutes=1)
        scheduler.add_job(scheduled_prediction_task, 'cron', hour=15, minute=2)  # Run at 3:02 PM every day
        scheduler.start()
        atexit.register(lambda: scheduler.shutdown())