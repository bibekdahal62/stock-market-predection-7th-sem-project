from django import forms
from django.contrib.auth.models import User

class LoginForm(forms.Form):
    useremail = forms.EmailField(required=True)
    password = forms.CharField(widget=forms.PasswordInput(), required=True)


class RegisterForm(forms.Form):
    first_name = forms.CharField(max_length = 30, label = 'First Name', required=True)
    last_name = forms.CharField(max_length = 30, label = 'Last Name', required=True)
    useremail = forms.EmailField(label='Email')
    password1 = forms.CharField(widget=forms.PasswordInput(), label='Password', required=True)
    password2 = forms.CharField(widget=forms.PasswordInput(), label='Confirm Password', required=True)

    def clean(self):
        cleaned_data =  super().clean()
        useremail = cleaned_data.get('useremail')
        pass1 = cleaned_data.get('password1')
        pass2 = cleaned_data.get('password2')

        if pass1 and pass2 and pass1 != pass2:
            raise forms.ValidationError("Passwords do not match")
        
        if useremail and User.objects.filter(email = useremail).exists():
            raise forms.ValidationError("Email already exists")

        return cleaned_data