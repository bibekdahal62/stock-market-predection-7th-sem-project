from django.shortcuts import render, redirect, get_list_or_404
from django.contrib.auth.models import User
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from .forms import LoginForm, RegisterForm

# Create your views here.
def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            useremail = form.cleaned_data['useremail']
            password = form.cleaned_data['password']
            try:
                user = User.objects.get(email = useremail)
                user = authenticate(request, username = user.username, password = password)
                if user is not None:
                    login(request, user)
                    return redirect('home')
                else:
                    form.add_error(None, 'Invalid username or password.')
            except User.DoesNotExist:
                form.add_error(None, 'User does not exists. Please login to continue')
    else:
        form = LoginForm()
    return render(request, 'authentication/login.html', {
        'form': form
    })
            

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            firstname = form.cleaned_data['first_name']
            lastname = form.cleaned_data['last_name']
            useremail = form.cleaned_data['useremail']
            password1 = form.cleaned_data['password1']

            user_name = useremail.split('@')[0]
            User.objects.create_user(username=user_name, email=useremail, first_name = firstname, last_name = lastname, password=password1)
            return redirect('login')
    else:
        form = RegisterForm()
    return render(request, 'authentication/register.html', {
        'form': form
    })


@login_required
def logout_view(request):
    logout(request)
    return redirect('home')