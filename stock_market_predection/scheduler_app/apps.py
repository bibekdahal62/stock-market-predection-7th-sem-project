from django.apps import AppConfig
from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings


class SchedulerAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scheduler_app'

    def ready(self):
        from stock_data.tasks import store_data
        from prediction.tasks import scheduled_prediction_task
        # Prevent double start due to Django reload
        if settings.DEBUG:
            import os
            if os.environ.get('RUN_MAIN') != 'true':
                return

        scheduler = BackgroundScheduler()
        scheduler.add_job(store_data, 'interval', minutes=1)
        scheduler.add_job(scheduled_prediction_task, 'cron', hour=11, minute=1)  # Run at 11:01 AM every day
        scheduler.start()
        # print("Scheduler has started....")
