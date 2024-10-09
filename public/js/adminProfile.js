document.addEventListener('DOMContentLoaded', function() {
    // Set up click event listeners for menu items
    document.querySelectorAll('.sidebar ul li').forEach(function(menuItem) {
        menuItem.addEventListener('click', function() {
            // Remove 'active' class from all menu items
            document.querySelectorAll('.sidebar ul li').forEach(function(item) {
                item.classList.remove('active');
            });

            // Hide all sections
            document.querySelectorAll('.content > section').forEach(function(section) {
                section.style.display = 'none';
            });

            // Add 'active' class to the clicked menu item
            menuItem.classList.add('active');

            // Show the section corresponding to the clicked menu item
            const sectionId = menuItem.getAttribute('data-section');
            document.getElementById(sectionId).style.display = 'block';
        });
    });

    // Optionally, you can trigger a click on the first menu item to show the default section
    document.querySelector('.sidebar ul li.active').click();


});

//---------------------PROFILE----------------

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('edit-profile-button').addEventListener('click', enableProfileEditing);
    document.getElementById('save-profile-button').addEventListener('click', saveProfileChanges);
    fetchProfileInfo();
});

function fetchProfileInfo() {
    // Simulating API call
    fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/adminProfile.php', {
        method: 'GET',
        headers: {
            'Authorization': 'OwnerID 1181903'
        }
    })
        .then(response => response.json())
        .then(data => {
            displayProfileInfo(data);
        })
        .catch(error => {
            console.error('Error fetching profile:', error);
            alert('Failed to load profile information. Please try again later.');
        });
}

function displayProfileInfo(data) {
    document.getElementById('owner-id').textContent = data.OwnerID || 'N/A';
    document.getElementById('profile-shop-id').textContent = data.ShopID || 'N/A';
    document.getElementById('name-display').textContent = data.Name || 'N/A';
    document.getElementById('contact-info-display').textContent = data.ContactInfo || 'N/A';
    document.getElementById('username-display').textContent = data.Username || 'N/A';
    document.getElementById('profile-email-display').textContent = data.email || 'N/A';
}

function enableProfileEditing() {
    console.log('Edit button clicked');

    const fields = ['name', 'contact-info', 'username', 'email'];
    const idMap = {
        'name': 'name-display',
        'contact-info': 'contact-info-display',
        'username': 'username-display',
        'email': 'profile-email-display'
    };

    fields.forEach(field => {
        const displayElement = document.getElementById(idMap[field]);
        if (displayElement) {
            const currentValue = displayElement.textContent.trim();
            displayElement.innerHTML = `<input type="${field === 'email' ? 'email' : 'text'}" id="${field}-input" value="${currentValue === 'N/A' ? '' : currentValue}">`;
        } else {
            console.error(`Element with ID ${idMap[field]} not found`);
        }
    });

    toggleButtonVisibility('edit-profile-button', 'none');
    toggleButtonVisibility('save-profile-button', 'inline-block');
}

function toggleButtonVisibility(buttonId, displayStyle) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = displayStyle;
    } else {
        console.error(`Button with ID ${buttonId} not found`);
    }
}


function saveProfileChanges() {
    const updatedData = {
        Name: document.getElementById('name-input')?.value,
        ContactInfo: document.getElementById('contact-info-input')?.value,
        Username: document.getElementById('username-input')?.value,
        email: document.getElementById('email-input')?.value
    };

    console.log('Request payload:', JSON.stringify(updatedData));

    fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/adminProfile.php', {
        method: 'PUT',
        headers: {
            'Authorization': 'OwnerID 1181903',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
        .then(response => response.text())  // Get the response as text
        .then(text => {
            console.log('Full server response:', text);
            // Try to parse as JSON if it looks like JSON
            if (text.trim().startsWith('{')) {
                return JSON.parse(text);
            } else {
                throw new Error('Server returned non-JSON response: ' + text);
            }
        })
        .then(data => {
            console.log('Success:', data);
            alert(data.message);
            fetchProfileInfo();
            document.getElementById('edit-profile-button').style.display = 'inline-block';
            document.getElementById('save-profile-button').style.display = 'none';
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please check the console for more details.');
        });
}
