from django.shortcuts import render, redirect, get_list_or_404
from django.contrib.auth.models import User
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from .forms import LoginForm, RegisterForm
from django.utils.http import url_has_allowed_host_and_scheme


# Create your views here.
def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            useremail = form.cleaned_data['useremail']
            password = form.cleaned_data['password']

            try:
                user_obj = User.objects.get(email=useremail)
                user = authenticate(request, username=user_obj.username, password=password)

                if user is not None:
                    login(request, user)

                    next_url = request.POST.get('next') or request.GET.get('next')

                    if next_url and url_has_allowed_host_and_scheme(next_url, allowed_hosts={request.get_host()}):
                        return redirect(next_url)
                    return redirect('home')

                else:
                    form.add_error(None, 'Invalid username or password.')

            except User.DoesNotExist:
                form.add_error(None, 'User does not exist. Please login to continue')

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


@login_required
@require_http_methods(["POST"])
def account_delete(request):
    user = request.user
    logout(request)
    user.delete()
    return redirect('home')