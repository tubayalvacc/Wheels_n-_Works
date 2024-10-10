// Global Constants
const CUSTOMER_ID = sessionStorage.getItem('CustomerID');  // Fetch the CustomerID from session storage or the login response.
const API_BASE_URL = 'http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/';

// Global variables to hold selected shop and date
let selectedShopId = null;
let selectedDate = null;
// At the top of your file, after the constants
function checkAndSetCustomerId() {
    let customerId = sessionStorage.getItem('CustomerID');

    // If CustomerID is not in sessionStorage, check localStorage
    if (!customerId) {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            customerId = user.CustomerID;
            // Store in sessionStorage for future use
            sessionStorage.setItem('CustomerID', customerId);
        } else {
            // Redirect to login if no user data is found
            window.location.href = '../WDI/WDI-VehicleRepairShop/public/index.html';
            return null;
        }
    }

    return customerId;
}
document.addEventListener('DOMContentLoaded', async () => {

// Event listeners
    document.getElementById('bookAppointmentForm').addEventListener('submit', bookAppointment);
    document.getElementById('editProfileForm').addEventListener('submit', editProfile);
    // document.getElementById('editAppointmentForm').addEventListener('submit', editUpdateAppointment);
    document.getElementById('shopSelect').addEventListener('change', loadAvailableSlots);
    document.getElementById('appointment-date').addEventListener('change', loadAvailableSlots);
    //document.getElementById('editAppointmentForm').addEventListener('submit', editUpdateAppointment);

    // Add event listeners for modal buttons
    document.getElementById('bookAppointmentBtn').addEventListener('click', openBookAppointmentModal);
    document.querySelector('#bookAppointmentModal .close').addEventListener('click', closeBookAppointmentModal);
    //document.querySelector('#editAppointmentModal .close').addEventListener('click', editCloseAppointmentModal);
    document.getElementById('shopSelect').addEventListener('change', loadAvailableDates);
    document.querySelector('.modal .close').addEventListener('click', closeEditProfileModal);

    //--------------------

// Attach the event listener
   // document.getElementById('customerEditApp-updateAppointment').addEventListener('click', customerEditAppUpdateAppointment);

    // Event listeners
   // document.getElementById('customerEditApp-updateAppointment').addEventListener('click', customerEditAppUpdateAppointment);
    //document.getElementById('customerEditApp-closeModal').addEventListener('click', () => customerEditAppCloseModal('customerEditApp-editModal'));
    document.getElementById('customerEditApp-shop').addEventListener('change', customerEditAppUpdateTimeSlots);
    document.getElementById('customerEditApp-customerName').addEventListener('input', () => document.getElementById('customerEditApp-updateAppointment').disabled = !document.getElementById('customerEditApp-customerName').value);
    document.getElementById('customerEditApp-customerEmail').addEventListener('input', () => document.getElementById('customerEditApp-updateAppointment').disabled = !document.getElementById('customerEditApp-customerEmail').value);
    document.getElementById('customerEditApp-carPlateNumber').addEventListener('input', () => document.getElementById('customerEditApp-updateAppointment').disabled = !document.getElementById('customerEditApp-carPlateNumber').value);

// Initialize shops and services
    customerEditAppFetchShops();
    customerEditAppFetchServices();

    //--------------------

    loadAvailableDates(); // Call this when the page loads if you want to load dates for the default shop

    const customerId = checkAndSetCustomerId();
    if (customerId) {
        loadShops();
        loadServices();
        loadAppointments();
        loadProfileDetails();
    }

    // Event listener for shop selection
    document.getElementById('shopSelect').addEventListener('change', function () {
        selectedShopId = this.value;
        console.log('Shop selected:', selectedShopId);

        // Only proceed if both shop and date are selected
        if (selectedShopId && selectedDate) {
            loadAvailableSlots(selectedShopId, selectedDate);
        }
    });

    fetchCustomerDetails();

    // Add event listener to the Edit Profile button
    document.getElementById('editProfileButton').addEventListener('click', (event) => {
        event.preventDefault(); // Prevent the default action of the link
        openEditProfileModal();
    });

    // Add event listener to the form for handling profile updates
    document.getElementById('editProfileForm').addEventListener('submit', editProfile);

    // Close modal event
    document.querySelector('#editProfileModal .close').addEventListener('click', () => {
        document.getElementById('editProfileModal').style.display = 'none';
    });

    // Close modal if user clicks outside of the modal
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('editProfileModal')) {
            document.getElementById('editProfileModal').style.display = 'none';
        }
    });

});


// Global variable to store available dates
let availableDates = [];


async function loadShops() {
    try {
        const response = await fetch(`${API_BASE_URL}CustomersAppointments.php?endpoint=shops`);
        const result = await response.json();
        const shops = result.data;
        const shopSelect = document.getElementById('shopSelect');
        shopSelect.innerHTML = '<option value="">Select a shop</option>';

        if (Array.isArray(shops)) {
            shops.forEach(shop => {
                shopSelect.innerHTML += `<option value="${shop.ShopID}">${shop.ShopName} - ${shop.Location}</option>`;
            });
            shopSelect.addEventListener('change', loadAvailableDates);
        } else {
            console.error('Shops data is not an array:', shops);
            shopSelect.innerHTML += '<option value="">Error loading shops</option>';
        }
    } catch (error) {
        console.error('Error loading shops:', error);
        document.getElementById('shopSelect').innerHTML = '<option value="">Error loading shops</option>';
    }
}

async function loadAvailableDates() {
    const shopId = document.getElementById('shopSelect').value;
    if (!shopId) {
        console.log('No shop selected.');
        return;
    }

    try {
        // Dummy logic to simulate available dates for next 30 days
        const today = new Date();
        availableDates = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            availableDates.push(date.toISOString().split('T')[0]);
        }

        console.log('Available dates:', availableDates);

        // Step 2: Initialize the date picker with the available dates after selecting the shop
        initializeDatePicker();
    } catch (error) {
        console.error('Error loading available dates:', error);
    }
}

// Function to initialize the date picker once the shop is selected
function initializeDatePicker() {
    const dateInput = document.getElementById('appointment-date');

    flatpickr(dateInput, {
        minDate: "today",
        enable: availableDates,  // availableDates should already be populated
        dateFormat: "Y-m-d",
        onChange: function (selectedDates, dateStr, instance) {
            selectedDate = dateStr;
            console.log('Date selected:', selectedDate);

            // Only proceed if both shop and date are selected
            if (selectedShopId && selectedDate) {
                loadAvailableSlots(selectedShopId, selectedDate);
            }
        }
    });
}

// Function to load available slots (only called when both shop and date are selected)
async function loadAvailableSlots(shopId, date) {
    console.log('Fetching slots for shop:', shopId, 'and date:', date);

    const apiUrl = `${API_BASE_URL}CustomersAppointments.php?endpoint=available_slots&ShopID=${shopId}&Date=${date}`;
    console.log('Fetching available slots from URL:', apiUrl);

    try {
        const response = await fetch(apiUrl);
        const result = await response.json();

        console.log('API Response:', result);

        if (result.success && result.data) {
            const {available_slots, unavailable_slots} = result.data;
            console.log('Available Slots:', available_slots);
            console.log('Unavailable Slots:', unavailable_slots);

            displayTimeSlots(available_slots, unavailable_slots);
        } else {
            console.warn('No slots found in the response.');
            displayTimeSlots([], []);
        }
    } catch (error) {
        console.error('Error fetching available slots:', error);
        displayTimeSlots([], []);
    }
}


// Function to display time slots
function displayTimeSlots(availableSlots, unavailableSlots) {
    const slotsSelect = document.getElementById('availableSlots');
    slotsSelect.innerHTML = '<option value="">Select a time slot</option>';

    const allSlots = generateTimeSlots('08:00', '19:30', 30);

    allSlots.forEach(slot => {
        const isAvailable = availableSlots.includes(slot) && !unavailableSlots.includes(slot);
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = `${slot.slice(0, 5)} - ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`;
        option.disabled = !isAvailable; // Disable if unavailable
        slotsSelect.appendChild(option);
    });
}



// Helper function to generate time slots
function generateTimeSlots(start, end, intervalMinutes) {
    const slots = [];
    let current = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    while (current < endTime) {
        slots.push(current.toTimeString().slice(0, 8)); // Include seconds
        current.setMinutes(current.getMinutes() + intervalMinutes);
    }

    return slots;
}


// Fetch and populate services
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE_URL}CustomersAppointments.php?endpoint=services`);
        const result = await response.json();
        const services = result.data; // Access the services array from the data property
        const serviceSelect = document.getElementById('serviceSelect');
        serviceSelect.innerHTML = '<option value="">Select a service</option>';

        if (Array.isArray(services)) {
            services.forEach(service => {
                const displayText = `${service.ServiceCode}-${service.ServiceName}-$${service.Cost}`;
                serviceSelect.innerHTML += `<option value="${service.ServiceCode}">${displayText}</option>`;
            });
        } else {
            console.error('Services data is not an array:', services);
            serviceSelect.innerHTML += '<option value="">Error loading services</option>';
        }
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('serviceSelect').innerHTML = '<option value="">Error loading services</option>';
    }
}

//-----BOOK APPOINTMENT----------
async function bookAppointment(event) {
    event.preventDefault();

    const CUSTOMER_ID = sessionStorage.getItem('CustomerID');
    if (!CUSTOMER_ID) {
        showBookingNotification("User not logged in. Please log in first.", true);
        return; // Exit the function if no customer ID
    }

    const formData = new FormData(event.target);
    const appointmentData = {
        CustomerID: CUSTOMER_ID,
        Date: formData.get('date'),
        Time: formData.get('time'),
        ServiceCode: formData.get('serviceCode'),
        ShopID: formData.get('shopId'),
        CarPlateNumber: formData.get('carPlateNumber') || '',
        CustomerEmail: formData.get('customerEmail') || '',
        CustomerName: formData.get('customerName') || ''
    };

    console.log('Appointment Data:', appointmentData);

    try {
        const response = await fetch(`${API_BASE_URL}CustomersAppointments.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            showBookingNotification("Error creating appointment. Please try again!", true);
            return;
        }

        // Check if the response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorText = await response.text();
            console.error('Non-JSON response:', errorText);
            showBookingNotification("Unexpected server response. Please try again later.", true);
            return;
        }

        const result = await response.json();

        if (result.success) {
            showBookingNotification("Appointment Booked Successfully! Congrats!");
            closeBookAppointmentModal();
            loadAppointments(); // Assuming this loads the appointments correctly
        } else {
            showBookingNotification("Ooops!! Not Created!", true);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showBookingNotification("Error creating appointment. Please try again!", true);
    }
}




let services = []; // Global variable to store services

async function loadingServices() {
    try {
        const response = await fetch(`${API_BASE_URL}CustomersAppointments.php?endpoint=services`);
        const result = await response.json();
        console.log("Services data:", result.data);
        services = result.data; // Store services globally
        const serviceSelect = document.getElementById('serviceSelect');
        serviceSelect.innerHTML = '<option value="">Select a service</option>';

        if (Array.isArray(services)) {
            services.forEach(service => {
                const displayText = `${service.ServiceCode}-${service.ServiceName}-$${service.Cost}`;
                serviceSelect.innerHTML += `<option value="${service.ServiceCode}">${displayText}</option>`;
            });
        } else {
            console.error('Services data is not an array:', services);
            serviceSelect.innerHTML += '<option value="">Error loading services</option>';
        }
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('serviceSelect').innerHTML = '<option value="">Error loading services</option>';
    }
}

async function loadAppointments() {
    const CUSTOMER_ID = sessionStorage.getItem('CustomerID');
    if (!CUSTOMER_ID) {
        console.error('Customer ID is not set.');
        return; // Stop the function if no Customer ID is found
    }

    try {
        const response = await fetch(`${API_BASE_URL}appointments.php?CustomerID=${CUSTOMER_ID}`);

        // Check if the response is OK (status code 200)
        if (!response.ok) {
            console.error('HTTP error:', response.status, response.statusText);
            document.getElementById('currentAppointments').innerHTML = '<li>Server error. Please try again later.</li>';
            document.getElementById('previousAppointments').innerHTML = '<li>Server error. Please try again later.</li>';
            return;
        }

        const text = await response.text();
        console.log('Raw response text:', text); // Log the raw response

        // Check if the response is HTML (server error page) instead of JSON
        if (text.trim().startsWith('<')) {
            console.error('Error: The response returned HTML instead of JSON.');
            document.getElementById('currentAppointments').innerHTML = '<li>Server error. Please try again later.</li>';
            document.getElementById('previousAppointments').innerHTML = '<li>Server error. Please try again later.</li>';
            return;
        }

        // Trim whitespace and sanitize the response text by removing non-printable characters
        const sanitizedText = text.replace(/[^\x20-\x7E]/g, '').trim();

        console.log('Sanitized response text:', sanitizedText); // Log the sanitized response

        // Parse JSON and handle errors
        let appointments;
        try {
            appointments = JSON.parse(sanitizedText);
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            console.error('Response causing the error:', sanitizedText); // Log the problematic response
            document.getElementById('currentAppointments').innerHTML = '<li>Error loading appointments. Please try again later.</li>';
            document.getElementById('previousAppointments').innerHTML = '<li>Error loading previous appointments. Please try again later.</li>';
            return;
        }

        const currentAppointments = document.getElementById('currentAppointments');
        const previousAppointments = document.getElementById('previousAppointments');
        currentAppointments.innerHTML = '';
        previousAppointments.innerHTML = '';

        if (appointments && appointments.data && Array.isArray(appointments.data)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set time to 00:00:00 for comparison

            const futureAppointments = [];
            const pastAppointments = [];

            const appointmentPromises = appointments.data.map(async (appointment) => {
                const appointmentDate = new Date(appointment.Date + ' ' + appointment.Time); // Combine date and time

                // Fetch shop details for each appointment
                const respond = await fetch(`${API_BASE_URL}fetchShopName.php?appointmentId=${appointment.AppointmentID}`);
                const shopText = await respond.text();
                let myShopDetails;
                try {
                    myShopDetails = JSON.parse(shopText);
                    if (myShopDetails.error) {
                        console.error('Error from server:', myShopDetails.error);
                        return;
                    }
                } catch (shopJsonError) {
                    console.error('JSON parsing error:', shopJsonError);
                    console.error('Response causing the error:', shopText);
                    return;
                }


                // Find the service details from the globally stored services
                const service = services.find(s => String(s.ServiceCode) === String(appointment.ServiceCode));

                const formattedServiceDetails = service
                    ? `${service.ServiceCode} - ${service.ServiceName} - $${service.Cost}`
                    : 'Service details not available';

                const appointmentItem = `
                    <li class="appointment-item">
                        <div class="appointment-details">
                            <strong>Appointment ID:</strong> <span>${appointment.AppointmentID}</span>
                        </div>
                        <div class="appointment-details">
                            <strong>Shop Name:</strong> <span>${myShopDetails.ShopName}</span>
                        </div>
                        <div class="appointment-details">
                            <strong>Shop Location:</strong> <span>${myShopDetails.Location}</span>
                        </div>
                        <div class="appointment-details">
                            <strong>Date:</strong> <span>${appointment.Date}</span>
                        </div>
                        <div class="appointment-details">
                            <strong>Time:</strong> <span>${appointment.Time}</span>
                        </div>
                        <div class="appointment-details">
                            <strong>Service:</strong> <span>${formattedServiceDetails}</span>
                        </div>
                `;

                // Load future appointments with edit and delete buttons, and past appointments without actions
                if (appointmentDate >= today) {
                    futureAppointments.push(appointmentItem + `
                        <div class="appointment-actions">
                            <button class="edit-btn" onclick="editAppInitializeModal(${appointment.AppointmentID})">✏️ Edit</button>
                            <button class="delete-btn" onclick="deleteAppointment(${appointment.AppointmentID})">🗑️ Delete</button>
                        </div>
                    </li>`);
                } else {
                    pastAppointments.push(appointmentItem + `</li>`);
                }
            });

            // Wait for all appointment promises to resolve
            await Promise.all(appointmentPromises);

            // Sort future appointments by date and time
            futureAppointments.sort((a, b) => {
                const dateA = new Date(a.match(/<strong>Date:<\/strong> <span>(.*?)<\/span>/)[1] + ' ' + a.match(/<strong>Time:<\/strong> <span>(.*?)<\/span>/)[1]);
                const dateB = new Date(b.match(/<strong>Date:<\/strong> <span>(.*?)<\/span>/)[1] + ' ' + b.match(/<strong>Time:<\/strong> <span>(.*?)<\/span>/)[1]);
                return dateA - dateB; // Sort in ascending order
            });

            // Render appointments in the UI
            currentAppointments.innerHTML = futureAppointments.length ? futureAppointments.join('') : '<li>No upcoming appointments.</li>';
            previousAppointments.innerHTML = pastAppointments.length ? pastAppointments.join('') : '<li>No previous appointments.</li>';
        } else {
            currentAppointments.innerHTML = '<li>No appointments found or there was an error loading appointments.</li>';
            previousAppointments.innerHTML = '<li>No previous appointments found.</li>';
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        document.getElementById('currentAppointments').innerHTML = '<li>Error loading appointments. Please try again later.</li>';
        document.getElementById('previousAppointments').innerHTML = '<li>Error loading previous appointments. Please try again later.</li>';
    }
}


// Load services and appointments on page load
loadingServices().then(() => {
    loadAppointments();
});

//-----------------------------------------------------------------------------------
//--------------------------EDIT APPOINTMENT-----------------------------------------
// Function to initialize and open the edit modal with appointment details
let currentDate = new Date(); // Initialize currentDate
let selectedTimeSlot = null;



async function editAppInitializeModal(AppointmentID) {
    try {
        await customerEditAppFetchAppointment(AppointmentID);
        customerEditAppOpenAppointmentIdModal();
    } catch (error) {
        console.error('Error initializing edit modal:', error);
        customerEditAppShowNotification('Failed to initialize edit modal', 'error');
    }
}

// Open the appointment edit modal
function customerEditAppOpenAppointmentIdModal() {
    const modal = document.getElementById('customerEditApp-editModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('customerEditApp-customerName')?.focus();
    } else {
        console.error('Edit modal not found');
    }
}
// Fetch appointment details
async function customerEditAppFetchAppointment(AppointmentID) {
    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?AppointmentID=${AppointmentID}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const appointment = await response.json();
        if (!appointment) {
            throw new Error('No appointment data returned');
        }
        console.log('Fetched appointment:', appointment);

        // Populate the form with appointment details
        document.getElementById('customerEditApp-customerName').value = appointment.CustomerName || '';
        document.getElementById('customerEditApp-customerEmail').value = appointment.CustomerEmail || '';
        document.getElementById('customerEditApp-carPlateNumber').value = appointment.CarPlateNumber || '';
        document.getElementById('customerEditApp-shop').value = appointment.ShopID || '';
        document.getElementById('customerEditApp-service').value = appointment.ServiceCode || '';
        document.getElementById('customerEditApp-customerID').value = appointment.CustomerID || '';
        document.getElementById('customerEditApp-appointmentID').value = appointment.AppointmentID || '';
        document.getElementById('customerEditApp-date').value = appointment.Date || '';
        document.getElementById('customerEditApp-time').value = appointment.Time || '';

        // Parse the date string into a Date object
        selectedDate = new Date(appointment.Date);
        if (isNaN(selectedDate.getTime())) {
            console.error('Invalid date from appointment:', appointment.Date);
            selectedDate = new Date(); // Fallback to current date
        }

        selectedTimeSlot = appointment.Time;

        customerEditAppInitializeCalendar();
        customerEditAppUpdateTimeSlots();

    } catch (error) {
        console.error('Error fetching appointment:', error.message);
        throw error;
    }
}

function customerEditAppDisplayAppointmentDetails(appointment) {
    // Ensure that the elements exist before setting their values
    const customerName = document.getElementById('customerEditApp-customerName');
    const customerEmail = document.getElementById('customerEditApp-customerEmail');
    const carPlateNumber = document.getElementById('customerEditApp-carPlateNumber');
    const shopSelect = document.getElementById('customerEditApp-shop');
    const serviceSelect = document.getElementById('customerEditApp-service');
    const calendarGrid = document.getElementById('customerEditApp-calendarGrid');
    const timeSlotGrid = document.getElementById('customerEditApp-timeSlotGrid');

    if (customerName && customerEmail && carPlateNumber && shopSelect && serviceSelect && calendarGrid && timeSlotGrid) {
        customerName.value = appointment.CustomerName || '';
        customerEmail.value = appointment.CustomerEmail || '';
        carPlateNumber.value = appointment.CarPlateNumber || '';
        shopSelect.value = appointment.ShopID || '';
        serviceSelect.value = appointment.ServiceCode || '';

        customerEditAppInitializeCalendar();
        customerEditAppUpdateTimeSlots();

        document.getElementById('customerEditApp-editModal').style.display = 'block';
    } else {
        console.error('One or more elements for displaying appointment details are missing');
    }
}

// Close modals
function customerEditAppCloseModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.error(`Modal with ID ${modalId} not found`);
    }
}


function customerEditAppInitializeCalendar() {
    const calendarGrid = document.getElementById('customerEditApp-calendarGrid');
    if (!calendarGrid) {
        console.error('Calendar grid element not found');
        return;
    }

    calendarGrid.innerHTML = '';
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    for (let i = 0; i < firstDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.textContent = day;
        dayElement.classList.add('customerEditApp-calendar-day');

        if (selectedDate &&
            selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentDate.getMonth() &&
            selectedDate.getFullYear() === currentDate.getFullYear()) {
            dayElement.classList.add('selected');
        }

        dayElement.addEventListener('click', () => customerEditAppSelectDate(day));
        calendarGrid.appendChild(dayElement);
    }
}

function customerEditAppSelectDate(day) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    document.getElementById('customerEditApp-date').value = selectedDate.toISOString().split('T')[0];
    customerEditAppUpdateTimeSlots();
    customerEditAppInitializeCalendar();
}

async function customerEditAppUpdateTimeSlots() {
    const timeSlotGrid = document.getElementById('customerEditApp-timeSlotGrid');
    if (!timeSlotGrid) {
        console.error('Time slot grid element not found');
        return;
    }

    timeSlotGrid.innerHTML = '';

    if (!selectedDate || !document.getElementById('customerEditApp-shop').value) {
        console.error('Date or shop not selected');
        return;
    }

    try {
        const shopId = document.getElementById('customerEditApp-shop').value;
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?Date=${selectedDate.toISOString().split('T')[0]}&ShopID=${shopId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const { available_slots, unavailable_slots } = await response.json();

        const allSlots = [
            ...available_slots.map(slot => ({ time: slot, status: 'available' })),
            ...unavailable_slots.map(slot => ({ time: slot, status: 'unavailable' }))
        ].sort((a, b) => a.time.localeCompare(b.time));

        allSlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.classList.add('customerEditApp-time-slot', slot.status);
            slotElement.innerHTML = `
                <span class="time-label">${slot.time}</span>
                <span class="status-label">${slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}</span>
            `;
            slotElement.addEventListener('click', () => customerEditAppSelectTimeSlot(slot.time));
            timeSlotGrid.appendChild(slotElement);
        });
    } catch (error) {
        console.error('Failed to fetch available time slots:', error);
        customerEditAppShowNotification('Failed to load time slots', 'error');
    }
}



function customerEditAppSelectTimeSlot(slot) {
    selectedTimeSlot = slot;
    document.getElementById('customerEditApp-time').value = selectedTimeSlot;

    document.querySelectorAll('.customerEditApp-time-slot').forEach(element => {
        element.classList.toggle('selected', element.querySelector('.time-label').textContent === slot);
    });

    document.getElementById('customerEditApp-updateAppointment').disabled = !selectedDate || !selectedTimeSlot;
}


async function customerEditAppUpdateAppointment(event) {
    event.preventDefault();

    const formData = {
        CustomerID: document.getElementById('customerEditApp-customerID')?.value,
        ShopID: document.getElementById('customerEditApp-shop')?.value,
        AppointmentID: document.getElementById('customerEditApp-appointmentID')?.value,
        Date: document.getElementById('customerEditApp-date')?.value,
        Time: document.getElementById('customerEditApp-time')?.value,
        ServiceCode: document.getElementById('customerEditApp-service')?.value,
        CarPlateNumber: document.getElementById('customerEditApp-carPlateNumber')?.value,
        CustomerEmail: document.getElementById('customerEditApp-customerEmail')?.value,
        CustomerName: document.getElementById('customerEditApp-customerName')?.value
    };

    console.log("Form Data:", formData);

    if (!formData.CustomerID || !formData.ShopID || !formData.AppointmentID || !formData.Date || !formData.Time || !formData.ServiceCode) {
        customerEditAppShowNotification('Missing required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            customerEditAppCloseModal('customerEditApp-editModal');
            customerEditAppShowNotification('Appointment updated successfully', 'success');
            // Optionally, refresh the appointment list or perform other updates
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        customerEditAppShowNotification(`Failed to update appointment: ${error.message}`, 'error');
    }
}

// Helper function to check if the appointment has been invoiced

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const updateButton = document.getElementById('customerEditApp-updateAppointment');
    if (updateButton) {
        updateButton.addEventListener('click', customerEditAppUpdateAppointment);
    }

    customerEditAppFetchShops();
    customerEditAppFetchServices();
});
// Fetch shops and populate dropdown
async function customerEditAppFetchShops() {
    const shopSelect = document.getElementById('customerEditApp-shop');
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
async function customerEditAppFetchServices() {
    const serviceSelect = document.getElementById('customerEditApp-service');
    try {
        const response = await fetch(`${API_BASE_URL}NonCustomerAppointment.php?allServices`);
        const services = await response.json();
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.ServiceCode;
            option.textContent = `${service.ServiceCode} - ${service.ServiceName}`;
            serviceSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to fetch services:', error);
    }
}

// Show notification
function customerEditAppShowNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `customerEditApp-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Add class to trigger the appearance animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500); // Delay removal for fade-out transition
    }, 3000);
}






//----------------------------EDIT PROFİLE-------------------------------------------
async function deleteAppointment(appointmentId) {
    // Create confirmation modal
    const confirmationModal = document.createElement('div');
    confirmationModal.style.position = 'fixed';
    confirmationModal.style.top = '0';
    confirmationModal.style.left = '0';
    confirmationModal.style.width = '100%';
    confirmationModal.style.height = '100%';
    confirmationModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    confirmationModal.style.display = 'flex';
    confirmationModal.style.justifyContent = 'center';
    confirmationModal.style.alignItems = 'center';
    confirmationModal.style.zIndex = '1000';

    const confirmationContent = document.createElement('div');
    confirmationContent.style.backgroundColor = '#fff';
    confirmationContent.style.padding = '20px';
    confirmationContent.style.borderRadius = '8px';
    confirmationContent.style.textAlign = 'center';
    confirmationContent.style.maxWidth = '400px';
    confirmationContent.style.width = '100%';

    const message = document.createElement('p');
    message.textContent = 'Are you sure you want to delete this appointment?';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Yes, Delete';
    confirmButton.style.backgroundColor = '#4CAF50';
    confirmButton.style.color = '#fff';
    confirmButton.style.border = 'none';
    confirmButton.style.padding = '10px 20px';
    confirmButton.style.margin = '10px';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.borderRadius = '5px';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.backgroundColor = '#f44336';
    cancelButton.style.color = '#fff';
    cancelButton.style.border = 'none';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.margin = '10px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.borderRadius = '5px';

    confirmationContent.appendChild(message);
    confirmationContent.appendChild(confirmButton);
    confirmationContent.appendChild(cancelButton);
    confirmationModal.appendChild(confirmationContent);
    document.body.appendChild(confirmationModal);

    confirmButton.onclick = async function () {
        confirmationModal.style.display = 'none';
        document.body.removeChild(confirmationModal);

        // Make the API call to delete the appointment
        const response = await fetch(`${API_BASE_URL}CustomersAppointments.php?AppointmentID=${appointmentId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        showDeleteNotification(result.success ? 'Appointment Deleted Successfully!' : 'Oops! Not Deleted!', result.success);
        if (result.success) {
            loadAppointments();
        }
    };

    cancelButton.onclick = function () {
        confirmationModal.style.display = 'none';
        document.body.removeChild(confirmationModal);
    };
}

function showDeleteNotification(message, isSuccess) {
    const notificationModal = document.createElement('div');
    notificationModal.style.position = 'fixed';
    notificationModal.style.top = '0';
    notificationModal.style.left = '0';
    notificationModal.style.width = '100%';
    notificationModal.style.height = '100%';
    notificationModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    notificationModal.style.display = 'flex';
    notificationModal.style.justifyContent = 'center';
    notificationModal.style.alignItems = 'center';
    notificationModal.style.zIndex = '1000';

    const notificationContent = document.createElement('div');
    notificationContent.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da'; // Light green for success, light red for error
    notificationContent.style.padding = '20px';
    notificationContent.style.borderRadius = '8px';
    notificationContent.style.textAlign = 'center';
    notificationContent.style.maxWidth = '400px';
    notificationContent.style.width = '100%';

    const messageElement = document.createElement('p');
    messageElement.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.backgroundColor = '#8acd2b';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.margin = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.borderRadius = '5px';

    notificationContent.appendChild(messageElement);
    notificationContent.appendChild(closeButton);
    notificationModal.appendChild(notificationContent);
    document.body.appendChild(notificationModal);

    closeButton.onclick = function () {
        notificationModal.style.display = 'none';
        document.body.removeChild(notificationModal);
    };
}

// Modal functions
function openBookAppointmentModal() {
    document.getElementById('bookAppointmentModal').style.display = 'block';
}

function closeBookAppointmentModal() {
    document.getElementById('bookAppointmentModal').style.display = 'none';
}

function showBookingNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    const checkmarkContainer = notification.querySelector('.checkmark-container');

    messageElement.textContent = message;
    notification.classList.add('show');

    if (isError) {
        notification.classList.add('error');
        checkmarkContainer.style.display = 'none';
    } else {
        notification.classList.remove('error');
        checkmarkContainer.style.display = 'block';
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

//-----------------EDIT PROFİLE DETAİLS-------------------

// Fetch customer details from localStorage or API
function fetchCustomerDetails() {
    const user = JSON.parse(localStorage.getItem('user')); // Get user from localStorage

    if (user) {
        // Populate data from localStorage
        populateProfileData(user);
    } else {
        // Fetch from API if not in localStorage
        fetch(`${API_BASE_URL}/Customers.php?CustomerID=${CUSTOMER_ID}`)
            .then(response => response.json())
            .then(data => {
                console.log('API response:', data); // Log the entire response
                if (data.message) {
                    console.error(data.message);
                    return;
                }
                populateProfileData(data);

                // Store in localStorage for future reference
                localStorage.setItem('user', JSON.stringify(data));
            })
            .catch(error => console.error('Error:', error));

    }
}

// Populate profile data in the HTML page
function populateProfileData(data) {
    if (!data) {
        console.error('No data received');
        return;
    }
    document.getElementById('customerId').textContent = data.CustomerID || '';
    document.getElementById('customerName').textContent = data.NameSurname || '';
    document.getElementById('customerEmail').textContent = data.Email || '';
    document.getElementById('customerMobile').textContent = data.ContactNumber || '';
    document.getElementById('customerAddress').textContent = data.Address || '';
    document.getElementById('carPlateNumber').textContent = data.CarPlateNumber || '';
}

// Populate profile form for editing
function populateProfileForm() {
    const user = JSON.parse(localStorage.getItem('user')); // Fetch from localStorage
    if (user) {
        document.getElementById("editCustomerId").value = user.CustomerID || '';
        document.getElementById("editName").value = user.NameSurname || '';
        document.getElementById("editEmail").value = user.Email || '';
        document.getElementById("editMobile").value = user.ContactNumber || '';
        document.getElementById("editAddress").value = user.Address || '';
        document.getElementById("editCarPlateNumber").value = user.CarPlateNumber || '';
    }
}

// Open edit profile modal
function openEditProfileModal() {
    populateProfileForm();
    document.getElementById("editProfileModal").style.display = "block";
}

// Update profile and save changes to both API and localStorage
async function editProfile(event) {
    event.preventDefault(); // Prevent default form submission

    const formData = new FormData(event.target); // Get form data
    const profileData = Object.fromEntries(formData); // Convert form data to JSON

    try {
        const response = await fetch(`${API_BASE_URL}Customers.php?CustomerID=${CUSTOMER_ID}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(profileData)
        });

        const result = await response.json(); // Parse JSON response

        // Debug output
        console.log('API response:', result);

        // Check if the message indicates success
        if (result.message && result.message.includes('successfully')) {
            showBookingNotification("Profile Details Updated Successfully!");

            // Update localStorage with new profile data
            localStorage.setItem('user', JSON.stringify(profileData));

            loadProfileDetails(); // Refresh profile details on the page
            closeEditProfileModal();
        } else {
            console.error('Update failed:', result.message); // Log the server-side message
            showBookingNotification(`Not Updated! ${result.message}`, true); // Show error notification
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showBookingNotification("An error occurred while updating the profile.", true);
    }
}

// Close edit profile modal
function closeEditProfileModal() {
    document.getElementById("editProfileModal").style.display = "none";
}

// Load profile details into the page (from API or localStorage)
async function loadProfileDetails() {
    const user = JSON.parse(localStorage.getItem('user')); // First, check localStorage

    if (user) {
        // Populate with localStorage data
        populateProfileData(user);
    } else {
        // Fetch from API if not in localStorage
        const response = await fetch(`${API_BASE_URL}Customers.php?CustomerID=${CUSTOMER_ID}`);
        const profile = await response.json();
        localStorage.setItem('user', JSON.stringify(profile)); // Store it in localStorage for next time
        populateProfileData(profile);
    }
}

document.getElementById('logoutBtn').addEventListener('click', function(event) {
    event.preventDefault();

    // Simulate logout process
    localStorage.removeItem('user'); // Remove user details from local storage (assuming you store it here)
    sessionStorage.removeItem('token'); // Remove authentication token (if stored in sessionStorage)

    // Redirect to login page after logout
    window.location.href = '../WDI/WDI-VehicleRepairShop/public/index.html';
});


/*async function fetchCarBrands() {
    try {
        const response = await fetch(`${API_BASE_URL}Cars.php?endpoint=car-brands`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Car Brands:', data);
    } catch (error) {
        console.error('Error fetching car brands:', error);
    }
}

// Call the function
fetchCarBrands();
*/

