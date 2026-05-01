from django.db import models
from django.contrib.auth.models import User

class PortfolioItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolio')
    symbol = models.CharField(max_length=20)
    buy_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'symbol')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} — {self.symbol}"