// Constants
const API_BASE_URL = 'http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/';
const DEFAULT_CUSTOMER_ID = '100000001';

// Create notification container
const notificationContainer = document.createElement('div');
notificationContainer.id = 'appointmentNotifications';
notificationContainer.className = 'appointment-notifications';
document.body.appendChild(notificationContainer);

// Get modal elements
const modal = document.getElementById('appointmentModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.querySelector('.app-close');

// Get form elements
const shopSelect = document.getElementById('shop');
const serviceSelect = document.getElementById('service');
const customerNameInput = document.getElementById('customerName');
const customerEmailInput = document.getElementById('customerEmail');
const customerPhoneInput = document.getElementById('customerPhone');
const carPlateNumberInput = document.getElementById('carPlateNumber');

// Get calendar elements
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const timeSlotGrid = document.getElementById('timeSlotGrid');
const bookAppointmentBtn = document.getElementById('bookAppointment');

// State
let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;
let selectedShop = null;

// Modal functions
if (openModalBtn) {
    openModalBtn.addEventListener('click', function() {
        if (modal) modal.style.display = 'block';
    });
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', function() {
        if (modal) modal.style.display = 'none';
    });
}

window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Calendar functions
function generateCalendar(year, month) {
    if (!calendarGrid || !currentMonthElement) return;

    calendarGrid.innerHTML = '';
    currentMonthElement.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = i;
        dayElement.classList.add('app-calendar-day');
        dayElement.addEventListener('click', () => selectDate(new Date(year, month, i)));
        calendarGrid.appendChild(dayElement);
    }
}

function selectDate(date) {
    if (!selectedShop) {
        alert('Please select a shop first.');
        return;
    }
    selectedDate = date;
    document.querySelectorAll('.app-calendar-day').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
    fetchAvailableSlots(date);
}

function fetchAvailableSlots(date) {
    const formattedDate = date.toISOString().split('T')[0];
    fetch(`${API_BASE_URL}NonCustomerAppointment.php?Date=${formattedDate}&ShopID=${selectedShop}`)
        .then(response => response.json())
        .then(data => {
            generateTimeSlots(data.available_slots, data.unavailable_slots);
        })
        .catch(error => console.error('Error fetching available slots:', error));
}

function generateTimeSlots(availableSlots, unavailableSlots) {
    if (!timeSlotGrid) return;

    timeSlotGrid.innerHTML = '';

    // Generate available slots
    availableSlots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.textContent = slot;
        slotElement.classList.add('app-time-slot', 'available');
        slotElement.addEventListener('click', () => selectTimeSlot(slot));
        timeSlotGrid.appendChild(slotElement);
    });

    // Generate unavailable slots
    unavailableSlots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.textContent = slot;
        slotElement.classList.add('app-time-slot', 'unavailable');
        slotElement.addEventListener('click', () => alert('This slot is unavailable.'));
        timeSlotGrid.appendChild(slotElement);
    });
}

function selectTimeSlot(time) {
    selectedTimeSlot = time;
    document.querySelectorAll('.app-time-slot').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
}

// Event listeners
if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });
}

if (shopSelect) {
    shopSelect.addEventListener('change', function() {
        selectedShop = this.value;
        if (selectedDate) {
            fetchAvailableSlots(selectedDate);
        }
    });
}

if (bookAppointmentBtn) {
    bookAppointmentBtn.addEventListener('click', () => {
        if (!selectedShop || !selectedDate || !selectedTimeSlot || !serviceSelect.value) {
            alert('Please select a shop, date, time, and service.');
            return;
        }

        const appointmentData = {
            CustomerID: DEFAULT_CUSTOMER_ID,
            Date: selectedDate.toISOString().split('T')[0],
            Time: selectedTimeSlot,
            ServiceCode: serviceSelect.value,
            ShopID: selectedShop,
            CarPlateNumber: carPlateNumberInput ? carPlateNumberInput.value : '',
            CustomerEmail: customerEmailInput ? customerEmailInput.value : '',
            CustomerName: customerNameInput ? customerNameInput.value : '',
            CustomerPhone: customerPhoneInput ? customerPhoneInput.value : ''
        };

        fetch(`${API_BASE_URL}NonCustomerAppointment.php?appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(appointmentData),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    appointmentCreateNotification("success", "Appointment Created Successfully! Congrats! 🎉");
                    if (modal) modal.style.display = 'none';
                } else {
                    appointmentCreateNotification("error", 'Failed to book appointment: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error booking appointment:', error);
                appointmentCreateNotification("error", 'An error occurred while booking the appointment.');
            });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchShops();
    fetchServices();
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
});

// Fetch functions
function fetchShops() {
    if (!shopSelect) return;

    fetch(`${API_BASE_URL}fetch_shop_details.php?allShops`)
        .then(response => response.json())
        .then(shops => {
            shops.forEach(shop => {
                const option = document.createElement('option');
                option.value = shop.ShopID;
                option.textContent = `${shop.ShopName} - ${shop.Location}`;
                shopSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching shops:', error));
}

function fetchServices() {
    if (!serviceSelect) return;

    fetch(`${API_BASE_URL}NonCustomerAppointment.php?allServices`)
        .then(response => response.json())
        .then(services => {
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.ServiceCode;
                option.textContent = `${service.ServiceCode} - ${service.ServiceName} - $${service.Cost}`;
                serviceSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching services:', error));
}

// Notification functions
function appointmentCreateNotification(type, message) {
    if (!notificationContainer) {
        console.error('Notification container not found.');
        return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `appointment-notification ${type} show`;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'appointment-close-btn';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500); // Remove after animation
    };

    // Append message and close button
    notification.innerHTML = message;
    notification.appendChild(closeButton);

    // Append notification to container
    notificationContainer.appendChild(notification);

    // Automatically hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500); // Remove after animation
    }, 5000);
}

//------------------ E D I  T   D E L E T E  -  U P D A T E ----------------------------

// Event listeners
document.getElementById('appointmentIdForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const appointmentId = document.getElementById('appointmentId').value;
    editAppFetchAppointment(appointmentId);
});
document.getElementById('openAppointmentIdModal').addEventListener('click', editAppOpenAppointmentIdModal);

document.getElementById('openAppointmentIdModal').addEventListener('click', editAppShowEditForm);
document.getElementById('deleteAppointmentBtn').addEventListener('click', editAppDeleteAppointment);
document.getElementById('editAppointmentForm').addEventListener('submit', editAppUpdateAppointment);
document.getElementById('editapp-prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    editAppInitializeCalendar();
});
document.getElementById('editapp-nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    editAppInitializeCalendar();
});

// Close button event listeners
document.querySelectorAll('.editapp-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => editAppCloseModal(closeBtn.closest('.editapp-modal').id));
});
// Event delegation for closing modals
document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('editapp-modal') || event.target.classList.contains('editapp-close')) {
        editAppCloseModal(event.target.closest('.editapp-modal').id);
    }
});

// Prevent clicks within modal content from closing the modal
document.querySelectorAll('.editapp-modal-content').forEach(content => {
    content.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});

// Global variables
let currentAppointment = null;
// ... (previous code remains the same)



// Make sure this function is defined in your JavaScript
function editAppOpenAppointmentIdModal() {
    const modal = document.getElementById('appointmentIdModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('appointmentId').focus(); // Automatically focuses input
    } else {
        console.error('Appointment ID modal not found');
    }
}

// Function to close modals
function editAppCloseModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Function to fetch appointment details
async function editAppFetchAppointment(AppointmentId) {
    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?AppointmentID=${AppointmentId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const appointment = await response.json();

        if (!appointment) {
            throw new Error('No appointment data returned');
        }

        console.log('Fetched appointment:', appointment); // Log the appointment data to check if it’s correct
        editAppDisplayAppointmentDetails(appointment);

    } catch (error) {
        console.error('Error fetching appointment:', error.message); // Log error details for debugging
        alert(`Error: ${error.message}`);
    }
}


// Function to display appointment details
function editAppDisplayAppointmentDetails(appointment) {
    currentAppointment = appointment;
    const detailsDiv = document.getElementById('appointmentDetails');
    detailsDiv.innerHTML = `
        <p><strong>Appointment ID:</strong> ${appointment.AppointmentID}</p>
        <p><strong>Customer Name:</strong> ${appointment.CustomerName}</p>
        <p><strong>Email:</strong> ${appointment.CustomerEmail}</p>
        <p><strong>Car Plate Number:</strong> ${appointment.CarPlateNumber}</p>
        <p><strong>Shop:</strong> ${appointment.ShopID}</p>
        <p><strong>Service:</strong> ${appointment.ServiceCode}</p>
        <p><strong>Service Details:</strong> ${appointment.ServiceDetails}</p>
        <p><strong>Date:</strong> ${appointment.Date}</p>
        <p><strong>Time:</strong> ${appointment.Time}</p>
    `;
    document.getElementById('appointmentActions').style.display = 'block';
    document.getElementById('editAppointmentModal').style.display = 'block';
}

// Function to show edit form
function editAppShowEditForm() {
    console.log('Current Appointment:', currentAppointment);  // Check if the data is correct

    // Hide appointment details and show the edit form
    document.getElementById('appointmentDetails').style.display = 'none';
    document.getElementById('appointmentActions').style.display = 'none';
    document.getElementById('editAppointmentForm').style.display = 'block';

    // Debug form field values
    const customerNameField = document.getElementById('editapp-customerName');
    const customerEmailField = document.getElementById('editapp-customerEmail');
    const carPlateNumberField = document.getElementById('editapp-carPlateNumber');
    const shopField = document.getElementById('editapp-shop');
    const serviceField = document.getElementById('editapp-service');

    console.log('Setting Customer Name:', currentAppointment.CustomerName);
    customerNameField.value = currentAppointment.CustomerName || '';

    console.log('Setting Customer Email:', currentAppointment.CustomerEmail);
    customerEmailField.value = currentAppointment.CustomerEmail || '';

    console.log('Setting Car Plate Number:', currentAppointment.CarPlateNumber);
    carPlateNumberField.value = currentAppointment.CarPlateNumber || '';

    console.log('Setting Shop ID:', currentAppointment.ShopID);
    shopField.value = currentAppointment.ShopID || '';

    console.log('Setting Service Code:', currentAppointment.ServiceCode);
    serviceField.value = currentAppointment.ServiceCode || '';

    // Initialize calendar and time slots
    editAppInitializeCalendar();
    editAppUpdateTimeSlots();
}


// Function to initialize calendar
function editAppInitializeCalendar() {
    const calendarGrid = document.getElementById('editapp-calendarGrid');
    calendarGrid.innerHTML = '';

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    document.getElementById('editapp-currentMonth').textContent =
        `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`;

    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        dayElement.classList.add('editapp-calendar-day');
        dayElement.addEventListener('click', () => editAppSelectDate(day));
        calendarGrid.appendChild(dayElement);
    }
}

// Function to select a date
function editAppSelectDate(day) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    editAppUpdateTimeSlots();
}

// Function to update time slots
async function editAppUpdateTimeSlots() {
    const timeSlotGrid = document.getElementById('editapp-timeSlotGrid');
    timeSlotGrid.innerHTML = '';

    if (!selectedDate || !document.getElementById('editapp-shop').value) {
        alert('Please select a date and shop');
        return;
    }

    try {
        const shopId = document.getElementById('editapp-shop').value;
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?Date=${selectedDate.toISOString().split('T')[0]}&ShopID=${shopId}`);
        const { available_slots, unavailable_slots } = await response.json();

        // Create a combined list of time slots with their status
        const allSlots = [
            ...available_slots.map(slot => ({ time: slot, status: 'available' })),
            ...unavailable_slots.map(slot => ({ time: slot, status: 'unavailable' }))
        ];

        // Sort slots by time (if necessary)
        allSlots.sort((a, b) => a.time.localeCompare(b.time));

        allSlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.classList.add('editapp-time-slot', slot.status);

            // Create time label
            const timeLabel = document.createElement('span');
            timeLabel.classList.add('time-label');
            timeLabel.textContent = slot.time;

            // Create status label
            const statusLabel = document.createElement('span');
            statusLabel.classList.add('status-label');
            statusLabel.textContent = slot.status.charAt(0).toUpperCase() + slot.status.slice(1); // Capitalize the first letter

            // Append labels to slot element
            slotElement.appendChild(timeLabel);
            slotElement.appendChild(statusLabel);

            // Add click event
            slotElement.addEventListener('click', () => editAppSelectTimeSlot(slot.time));
            timeSlotGrid.appendChild(slotElement);
        });
    } catch (error) {
        console.error('Failed to fetch available time slots:', error);
    }
}



// Function to select a time slot
function editAppSelectTimeSlot(slot) {
    selectedTimeSlot = slot;

    // Clear previous selections
    const previousSelection = document.querySelector('.editapp-time-slot.selected');
    if (previousSelection) {
        previousSelection.classList.remove('selected');
    }

    // Update UI to show selected time slot
    const slotElements = document.querySelectorAll('.editapp-time-slot');
    slotElements.forEach(element => {
        if (element.querySelector('.time-label').textContent === slot) {
            element.classList.add('selected');
        }
    });

    // Enable the update button if a date and time slot are selected
    document.getElementById('editapp-updateAppointment').disabled = !selectedDate || !selectedTimeSlot;
}


// Function to update appointment
async function editAppUpdateAppointment(event) {
    event.preventDefault();

    if (!selectedDate || !selectedTimeSlot) {
        alert('Please select a date and time slot');
        return;
    }

    // Create the updatedAppointment object with correct key names
    const updatedAppointment = {
        ShopID: document.getElementById('editapp-shop').value,
        AppointmentID: currentAppointment.AppointmentID, // Ensure it's the right property
        CustomerID: currentAppointment.CustomerID,
        Date: selectedDate.toISOString().split('T')[0],
        Time: selectedTimeSlot,
        ServiceCode: document.getElementById('editapp-service').value,
        CarPlateNumber: document.getElementById('editapp-carPlateNumber').value,
        CustomerEmail: document.getElementById('editapp-customerEmail').value,
        CustomerName: document.getElementById('editapp-customerName').value
    };


    // Log the payload to debug
    console.log('Updated Appointment Payload:', updatedAppointment);

    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedAppointment),
        });

        // Log response status and body for debugging
        const responseBody = await response.text();
        console.log('Response Status:', response.status);
        console.log('Response Body:', responseBody);

        if (!response.ok) {
            throw new Error('Failed to update appointment');
        }

        alert('Appointment updated successfully');
        editAppCloseModal('editAppointmentModal');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}





// Function to delete appointment
// Function to delete appointment
async function editAppDeleteAppointment() {
    if (confirm('Are you sure you want to delete this appointment?')) {
        try {
            const AppointmentID = currentAppointment.AppointmentID;  // Ensure the correct property is used

            if (!AppointmentID) {
                throw new Error('Invalid Appointment ID');
            }

            // Make the DELETE request to the API
            const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?AppointmentID=${AppointmentID}`, {
                method: 'DELETE',
            });

            const responseBody = await response.text();  // Log the response for debugging
            console.log('Response Body:', responseBody);

            if (!response.ok) {
                throw new Error('Failed to delete appointment');
            }

            alert('Appointment deleted successfully');
            editAppCloseModal('editAppointmentModal');
        } catch (error) {
            console.error('Error:', error);  // Log the error for debugging
            alert(error.message);
        }
    }
}




// Fetch shops and populate dropdown
async function editAppFetchShops() {
    const shopSelect = document.getElementById('editapp-shop');
    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?allShops`);
        const shops = await response.json();
        shops.forEach(shop => {
            const option = document.createElement('option');
            option.value = shop.ShopID;
            option.textContent = `${shop.ShopName} - ${shop.Location}`;
            shopSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to fetch shops:', error);
    }
}

// Fetch services and populate dropdown
async function editAppFetchServices() {
    const serviceSelect = document.getElementById('editapp-service');
    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?allServices`);
        const services = await response.json();
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.ServiceCode;
            option.textContent = `${service.ServiceCode} - ${service.ServiceName} - $${service.Cost}`;

            serviceSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to fetch services:', error);
    }
}

// Call these functions before showing the edit form
editAppFetchShops();
editAppFetchServices();





// Add this at the end of your JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    const openModalBtn = document.getElementById('edit-Appointment-Btn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', editAppOpenAppointmentIdModal);
    } else {
        console.error('Button to open appointment ID modal not found');
    }
// Event delegation for closing modals
    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('editapp-modal') || event.target.classList.contains('editapp-close')) {
            editAppCloseModal(event.target.closest('.editapp-modal').id);
        }
    });

// Prevent clicks within modal content from closing the modal
    document.querySelectorAll('.editapp-modal-content').forEach(content => {
        content.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
});