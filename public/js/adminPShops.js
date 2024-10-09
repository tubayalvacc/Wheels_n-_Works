//-----------SHOPS-------------AUTHOR - TUGBA YALVAC MOHAMMED-----------
document.addEventListener('DOMContentLoaded', function() {
    const shopID = 13; // Replace this with the actual ID you have

    // Fetch and display shop details
    fetchShopDetails(shopID);

    // Add event listeners for edit and save buttons
    document.getElementById('edit-shop-button').addEventListener('click', enableShopsEditing);
    document.getElementById('save-shop-button').addEventListener('click', () => saveShopsChanges(shopID));
});

function fetchShopDetails(shopID) {
    fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/shops.php?shopID=${shopID}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            displayShopDetails(data);
        })
        .catch(error => {
            console.error('Error fetching shop details:', error);
            alert('Failed to load shop details. Please try again later.');
        });
}

function displayShopDetails(data) {
    document.getElementById('shopID').textContent = data.ShopID || 'N/A';
    document.getElementById('shop-name-display').textContent = data.ShopName || 'N/A';
    document.getElementById('shop-location-display').textContent = data.Location || 'N/A';
    document.getElementById('shop-contact-display').textContent = data.ContactNumber || 'N/A';
    document.getElementById('email-display').textContent = data.Email || 'N/A';
}

function enableShopsEditing() {
    console.log('Edit button clicked'); // Debugging line

    const fields = ['shop-name', 'location', 'contact-number', 'email'];
    fields.forEach(field => {
        // Map the field names to the correct HTML IDs
        const idMap = {
            'shop-name': 'shop-name-display',
            'location': 'shop-location-display',
            'contact-number': 'shop-contact-display',
            'email': 'email-display'
        };

        const displayElement = document.getElementById(idMap[field]);
        if (displayElement) {
            const currentValue = displayElement.textContent.trim();
            displayElement.innerHTML = `<input type="${field === 'email' ? 'email' : 'text'}" id="${field}-input" value="${currentValue === 'N/A' ? '' : currentValue}">`;
        } else {
            console.error(`Element with ID ${idMap[field]} not found`);
        }
    });

    const editButton = document.getElementById('edit-shop-button');
    const saveButton = document.getElementById('save-shop-button');

    if (editButton) {
        editButton.style.display = 'none';
    } else {
        console.error('Edit button not found');
    }

    if (saveButton) {
        saveButton.style.display = 'inline-block';
    } else {
        console.error('Save button not found');
    }
}


function saveShopsChanges(shopID) {
    const updatedData = {
        ShopName: document.getElementById('shop-name-input').value,
        Location: document.getElementById('location-input').value,
        ContactNumber: document.getElementById('contact-number-input').value,
        Email: document.getElementById('email-input').value,
        ShopID: shopID
    };

    fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/shops.php?shopID=${shopID}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData) // Convert object to JSON
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            fetchShopDetails(shopID); // Refresh the displayed info
            document.getElementById('edit-shop-button').style.display = 'inline-block';
            document.getElementById('save-shop-button').style.display = 'none';
        })
        .catch(error => {
            console.error('Error updating shop details:', error);
            alert('Failed to update shop details. Please try again later.');
        })
        .finally(() => {
            // Toggle buttons back to their original states
            document.getElementById('edit-shop-button').style.display = 'inline-block';
            document.getElementById('save-shop-button').style.display = 'none';
        });
}

