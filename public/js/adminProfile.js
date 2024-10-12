document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const loadingDots = document.getElementById('loadingDots');

    // Existing login code...

    // Logout functionality
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Clear localStorage
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('adminId');
            localStorage.removeItem('shopId');

            // Redirect to login page
            window.location.href = '../admin/adminLogin.html'; // Change this to the correct login page URL
        });
    }

    // Remaining existing code...
});

// adminProfile.js

let ownerId;

window.onload = () => {
    ownerId = localStorage.getItem('adminId');
    if (!ownerId) {
        console.error('Owner ID is missing in local storage.');
        return;
    }

    fetchProfile();
    fetchShop();
};

// Fetch Profile Information
async function fetchProfile() {
    const response = await fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/adminProfile.php?owner_id=${ownerId}`);

    if (!response.ok) {
        console.error('Failed to fetch profile:', response.statusText);
        return;
    }

    const text = await response.text();
    if (!text) {
        console.error('Empty response for profile');
        return;
    }

    try {
        const data = JSON.parse(text);
        if (data.error) {
            console.error('Error in response:', data.error);
            return;
        }
        document.getElementById('owner-id').textContent = data.user.OwnerID || 'N/A';
        document.getElementById('profile-shop-id').textContent = data.user.ShopID || 'N/A';
        document.getElementById('name-display').textContent = data.user.Name || 'N/A';
        document.getElementById('contact-info-display').textContent = data.user.ContactInfo || 'N/A';
        document.getElementById('username-display').textContent = data.user.Username || 'N/A';
        document.getElementById('profile-email-display').textContent = data.user.email || 'N/A';
    } catch (error) {
        console.error('Failed to parse JSON:', error);
    }
}

// Fetch Shop Information
async function fetchShop() {
    const response = await fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/adminProfile.php?owner_id=${ownerId}`);

    if (!response.ok) {
        console.error('Failed to fetch shop:', response.statusText);
        return;
    }

    const text = await response.text();
    if (!text) {
        console.error('Empty response for shop');
        return;
    }

    try {
        const data = JSON.parse(text);
        document.getElementById('shopID').textContent = data.shop.ShopID || 'N/A';
        document.getElementById('shop-name-display').textContent = data.shop.ShopName || 'N/A';
        document.getElementById('shop-location-display').textContent = data.shop.Location || 'N/A';
        document.getElementById('shop-contact-display').textContent = data.shop.ContactNumber || 'N/A';
        document.getElementById('email-display').textContent = data.shop.Email || 'N/A';
    } catch (error) {
        console.error('Failed to parse JSON:', error);
    }
}

// Save Profile Changes
async function saveProfile() {
    const updatedProfile = {
        type: 'profile',
        name: document.getElementById('name-display').textContent,
        contactInfo: document.getElementById('contact-info-display').textContent,
        username: document.getElementById('username-display').textContent,
        email: document.getElementById('profile-email-display').textContent
    };

    const response = await fetch('http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/adminProfile.php', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(updatedProfile)
    });

    const result = await response.json();
    alert(result.message);
}

// Save Shop Changes
async function saveShop() {
    const updatedShop = {
        type: 'shop',
        shopName: document.getElementById('shop-name-display').textContent,
        location: document.getElementById('shop-location-display').textContent,
        contactNumber: document.getElementById('shop-contact-display').textContent,
        email: document.getElementById('email-display').textContent
    };

    const response = await fetch('http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/adminProfile.php', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(updatedShop)
    });

    const result = await response.json();
    alert(result.message);
}

// Bind buttons to save functions
document.getElementById('save-profile-button').onclick = saveProfile;
document.getElementById('save-shop-button').onclick = saveShop;

// Sidebar navigation
document.addEventListener("DOMContentLoaded", function() {
    const sidebarItems = document.querySelectorAll('.sidebar ul li');
    const sections = document.querySelectorAll('main section');

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Hide all sections
            sections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });

            // Show the clicked section
            const sectionId = item.getAttribute('data-section');
            document.getElementById(sectionId).style.display = 'block';
            document.getElementById(sectionId).classList.add('active');

            // Update active item in sidebar
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
});
