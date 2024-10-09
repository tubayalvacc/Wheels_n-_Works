
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("modal-date");
    const timeSelect = document.getElementById("modal-time");
    const updateButton = document.getElementById("updateButton");
    const modal = document.getElementById('editAppointmentModal');
    const closeBtn = document.querySelector('.close-btn');
    const appointmentsList = document.getElementById('appointments-list');
    const serviceCodeSelect = document.getElementById('modal-serviceCode');

    const shopId = document.getElementById('shopOwnerId').value || '13'; // Get shopId from a hidden input or use a default

    if (dateInput) {
        dateInput.addEventListener("change", () => {
            const date = dateInput.value;
            const shopId = document.getElementById("modal-shopId")?.value;
            if (date && shopId) {
                populateTimeSlots(date, shopId);
            } else {
                console.warn('Date or ShopID not available for populating time slots');
            }
        });
    } else {
        console.warn('Date input element not found');
    }

    if (appointmentsList) {
        appointmentsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-app-btn')) {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                editAppointment(appointmentId);
            } else if (event.target.classList.contains('delete-btn')) {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                deleteAppointment(appointmentId);
            }
        });
    } else {
        console.error('Appointments list element not found');
    }

    if (updateButton) {
        updateButton.addEventListener('click', updateAppointment);
    } else {
        console.error('Update button not found');
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(modal));
    } else {
        console.error('Close button not found');
    }

    if (modal) {
        window.onclick = (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        };
    } else {
        console.error('Modal element not found');
    }

    if (dateInput) {
        initializeDatepicker(dateInput);
    }

    // Fetch appointments on page load
   fetchAppointments('13'); // Provide actual ShopID dynamically if needed

    // Fetch and populate service codes on page load
    fetchServiceCodes();

    function fetchAppointments(shopId) {
        fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php?ShopID=${shopId}`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                const appointmentsList = document.getElementById("appointments-list");
                if (!appointmentsList) {
                    console.error('Appointments list element not found');
                    return;
                }
                appointmentsList.innerHTML = ""; // Clear previous content

                const today = new Date().toISOString().split('T')[0];

                // Filter appointments from today onwards
                const futureAppointments = Array.isArray(data)
                    ? data.filter(appointment => appointment.Date >= today)
                    : [];

                // Sort appointments by date
                futureAppointments.sort((a, b) => new Date(a.Date) - new Date(b.Date));

                if (futureAppointments.length > 0) {
                    futureAppointments.forEach(appointment => {
                        const appointmentElement = document.createElement("div");
                        appointmentElement.classList.add("appointment-item");
                        appointmentElement.innerHTML = `
                        <p><strong>Appointment ID:</strong> ${appointment.AppointmentID}</p>
                        <p><strong>Customer ID:</strong> ${appointment.CustomerID}</p>
                        <p><strong>Date:</strong> ${appointment.Date}</p>
                        <p><strong>Time:</strong> ${appointment.Time}</p>
                        <p><strong>Service Code:</strong> ${appointment.ServiceCode}</p>
                        <p><strong>Service Details:</strong> ${appointment.ServiceDetails}</p>
                        <p><strong>Car Plate Number:</strong> ${appointment.CarPlateNumber}</p>
                        <p><strong>Customer Name:</strong> ${appointment.CustomerName}</p>
                        <p><strong>Customer Email:</strong> ${appointment.CustomerEmail}</p>
                        <button class="edit-app-btn" data-appointment-id="${appointment.AppointmentID}">Edit</button>
                        <button class="delete-btn" data-appointment-id="${appointment.AppointmentID}">Delete</button>
                    `;
                        appointmentsList.appendChild(appointmentElement);
                    });
                } else {
                    appointmentsList.innerHTML = "<p>No future appointments found.</p>";
                }
            })
            .catch(error => console.error('Error fetching appointments:', error));
    }


    function editAppointment(appointmentId) {
        console.log('Editing appointment:', appointmentId);
        const shopId = document.getElementById('shopOwnerId').value || '13';

        fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php?action=getAppointment&ShopID=${shopId}&AppointmentID=${appointmentId}`)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);

                const appointment = data.find(app => app.AppointmentID.toString() === appointmentId.toString());

                if (appointment) {
                    // Populate form fields
                    document.getElementById('modal-appointmentId').value = appointment.AppointmentID || '';
                    document.getElementById('modal-customerId').value = appointment.CustomerID || '';
                    document.getElementById('modal-date').value = formatDate(appointment.Date) || '';
                    document.getElementById('modal-time').value = appointment.Time || '';
                    document.getElementById('modal-serviceCode').value = appointment.ServiceCode || '';
                    document.getElementById('modal-carPlateNumber').value = appointment.CarPlateNumber || '';
                    document.getElementById('modal-customerName').value = appointment.CustomerName || '';
                    document.getElementById('modal-customerEmail').value = appointment.CustomerEmail || '';
                    document.getElementById('modal-shopId').value = shopId;

                    // Log IDs
                    console.log('Appointment ID:', appointment.AppointmentID);
                    console.log('Customer ID:', appointment.CustomerID);

                    // Populate time slots
                    populateTimeSlots(formatDate(appointment.Date), shopId, appointment.Time);

                    const modal = document.getElementById('editAppointmentModal');
                    if (modal) {
                        modal.style.display = 'flex';
                    } else {
                        console.error('Modal element not found');
                    }
                } else {
                    console.error('Appointment with ID ' + appointmentId + ' not found');
                }
            })
            .catch(error => {
                console.error('Error in editAppointment:', error);
                alert('Failed to load appointment details. Please check the console for more information.');
            });
    }


// Event listener for appointments list
    if (appointmentsList) {
        appointmentsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-app-btn')) {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                console.log('Edit button clicked with ID:', appointmentId);
                editAppointment(appointmentId);
            } else if (event.target.classList.contains('delete-btn')) {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                deleteAppointment(appointmentId);
            }
        });
    } else {
        console.error('Appointments list element not found');
    }



    function populateTimeSlots(date, shopId, selectedTime) {
        console.log('Populating time slots for date:', date, 'shopId:', shopId, 'selectedTime:', selectedTime);

        if (!date) {
            console.error('Date is undefined in populateTimeSlots');
            displayError('modal-time', 'Invalid date selected');
            return;
        }

        fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php?action=getAvailableSlots&Date=${date}&ShopID=${shopId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Time slots data:', data);
                const timeSelect = document.getElementById('modal-time');
                if (!timeSelect) {
                    throw new Error('Time select element not found');
                }

                timeSelect.innerHTML = ''; // Clear existing options

                if (!Array.isArray(data.available_slots) || !Array.isArray(data.unavailable_slots)) {
                    throw new Error('Invalid data structure: expecting arrays for available_slots and unavailable_slots');
                }

                // Combine and sort all time slots
                let allSlots = [...data.available_slots, ...data.unavailable_slots].sort();

                if (allSlots.length === 0) {
                    const option = document.createElement('option');
                    option.textContent = 'No time slots available';
                    timeSelect.appendChild(option);
                } else {
                    allSlots.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot;
                        const isAvailable = data.available_slots.includes(slot);
                        option.textContent = `${slot} ${isAvailable ? '(Available)' : '(Not Available)'}`;
                        option.disabled = !isAvailable;
                        if (slot === selectedTime) {
                            option.selected = true;
                        }
                        timeSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error('Error populating time slots:', error);
                console.error('Stack trace:', error.stack);
                displayError('modal-time', `Failed to load time slots: ${error.message}`);
            });
    }

    function displayError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<option value="">${message}</option>`;
            console.error('Error details:', message);
        } else {
            console.error(`Element with id '${elementId}' not found for error display`);
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }


    function initializeDatepicker(dateInput) {
        const shopId = document.getElementById("modal-shopId")?.value || '13';

        flatpickr(dateInput, {
            minDate: "today",
            dateFormat: "Y-m-d", // Ensure consistent date format
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                checkDateAvailability(dayElem.dateObj, shopId).then(isAvailable => {
                    if (!isAvailable) {
                        dayElem.classList.add("fully-booked");
                        dayElem.classList.add("flatpickr-disabled");
                    }
                });
            },
            onChange: function(selectedDates, dateStr, instance) {
                // When a date is selected, populate time slots
                if (selectedDates.length > 0) {
                    populateTimeSlots(dateStr, shopId);
                }
            }
        });
    }

    function checkDateAvailability(date, shopId) {
        const formattedDate = date.toISOString().split('T')[0];
        return fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php?Date=${formattedDate}&ShopID=${shopId}`)
            .then(response => response.json())
            .then(data => {
                return data.available_slots && data.available_slots.length > 0;
            })
            .catch(error => {
                console.error("Error checking date availability:", error);
                return true; // Assume available in case of error
            });
    }

    function fetchServiceCodes() {
        fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/fetch_services.php')
            .then(response => response.json())
            .then(data => {
                console.log('Fetched service codes:', data);
                if (Array.isArray(data)) {
                    serviceCodeSelect.innerHTML = ""; // Clear existing options

                    // Check if data is empty or contains services
                    if (data.length === 0 || (data.length === 1 && data[0].ServiceCode === '')) {
                        const option = document.createElement("option");
                        option.value = '';
                        option.textContent = 'No services available';
                        serviceCodeSelect.appendChild(option);
                    } else {
                        data.forEach(service => {
                            const option = document.createElement("option");
                            option.value = service.ServiceCode;
                            option.textContent = `${service.ServiceCode} - ${service.ServiceName}`;
                            serviceCodeSelect.appendChild(option);
                        });
                    }
                } else {
                    console.warn('Fetched data is not an array or is empty');
                    const option = document.createElement("option");
                    option.value = '';
                    option.textContent = 'Failed to load services';
                    serviceCodeSelect.appendChild(option);
                }
            })
            .catch(error => {
                console.error('Error fetching service codes:', error);
                const option = document.createElement("option");
                option.value = '';
                option.textContent = 'Failed to load services';
                serviceCodeSelect.appendChild(option);
            });
    }


// edit_appointment.js

    function updateAppointment() {
        // Get appointmentID and customerID from the form
        const appointmentID = document.getElementById('modal-appointmentId').value.trim();
        const customerID = document.getElementById('modal-customerId').value.trim();

        // Check if appointmentID and customerID are defined
        if (!appointmentID || !customerID) {
            console.error("appointmentID or customerID is not defined");
            return;
        }

        // Collect form data
        const fields = [
            'shopId', 'appointmentId', 'customerId', 'date', 'time', 'serviceCode',
            'carPlateNumber', 'customerName', 'customerEmail'
        ];
        const formData = {};

        fields.forEach(field => {
            const element = document.getElementById(`modal-${field}`);
            if (element) {
                formData[field] = element.value.trim();
            } else {
                console.warn(`Element modal-${field} not found`);
            }
        });

        // Validate and format date (YYYY-MM-DD)
        const dateInput = document.getElementById('modal-date');
        if (dateInput) {
            const dateValue = dateInput.value;
            console.log('Original date value:', dateValue);

            // Ensure the date is in YYYY-MM-DD format
            if (isValidDate(dateValue)) {
                formData.date = dateValue;
                console.log('Validated date:', formData.date);
            } else {
                alert("Invalid date. Please select a valid date in YYYY-MM-DD format.");
                return;
            }
        } else {
            console.error('Date input element not found');
            return;
        }

        // Validate time format (HH:MM)
        const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timePattern.test(formData.time)) {
            alert("Invalid time format. Please use HH:MM.");
            return;
        }

        // Check if all fields are filled
        if (Object.values(formData).every(value => value)) {
            console.log('Data being sent to server:', JSON.stringify(formData));

            // Example fetch request for updating appointment
            fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ShopID: formData.shopId,
                    AppointmentID: appointmentID,
                    CustomerID: customerID,
                    Date: formData.date,
                    Time: formData.time,
                    ServiceCode: formData.serviceCode,
                    CarPlateNumber: formData.carPlateNumber,
                    CustomerName: formData.customerName,
                    CustomerEmail: formData.customerEmail
                }),
                mode: 'cors'  // Ensure CORS mode
            })
                .then(response => response.text()) // Use .text() to debug response before parsing
                .then(text => {
                    try {
                        const data = JSON.parse(text);
                        console.log(data); // Handle JSON data here

                        // Close the modal
                        document.getElementById('editAppointmentModal').style.display = 'none';

                        // Show success notification
                        showNotification('Appointment updated successfully!');

                        // Refresh the appointments list
                        refreshAppointments();

                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        console.error('Response text:', text);
                    }
                })
                .catch(error => console.error('Error updating appointment:', error));

        } else {
            alert("Please fill all required fields.");
        }
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification show';
        notification.innerHTML = `
        <div class="checkmark-container">
            <svg class="checkmark" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14 27l7 7 13-13"/>
            </svg>
        </div>
        <div class="notification-text">${message}</div>
    `;
        document.body.appendChild(notification);

        // Hide the notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hidden');
            setTimeout(() => notification.remove(), 200); // Remove after animation
        }, 2000);
    }


    function refreshAppointments() {
        // Fetch and update the appointments list
        fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/appointments.php?ShopID=${shopId}`)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                const appointmentsList = document.getElementById("appointments-list");
                if (!appointmentsList) {
                    console.error('Appointments list element not found');
                    return;
                }
                appointmentsList.innerHTML = ""; // Clear previous content

                const today = new Date().toISOString().split('T')[0];

                // Filter appointments from today onwards
                const futureAppointments = Array.isArray(data)
                    ? data.filter(appointment => appointment.Date >= today)
                    : [];

                // Sort appointments by date
                futureAppointments.sort((a, b) => new Date(a.Date) - new Date(b.Date));

                if (futureAppointments.length > 0) {
                    futureAppointments.forEach(appointment => {
                        const appointmentElement = document.createElement("div");
                        appointmentElement.classList.add("appointment-item");
                        appointmentElement.innerHTML = `
                        <p><strong>Appointment ID:</strong> ${appointment.AppointmentID}</p>
                        <p><strong>Customer ID:</strong> ${appointment.CustomerID}</p>
                        <p><strong>Date:</strong> ${appointment.Date}</p>
                        <p><strong>Time:</strong> ${appointment.Time}</p>
                        <p><strong>Service Code:</strong> ${appointment.ServiceCode}</p>
                        <p><strong>Service Details:</strong> ${appointment.ServiceDetails}</p>
                        <p><strong>Car Plate Number:</strong> ${appointment.CarPlateNumber}</p>
                        <p><strong>Customer Name:</strong> ${appointment.CustomerName}</p>
                        <p><strong>Customer Email:</strong> ${appointment.CustomerEmail}</p>
                        <button class="edit-app-btn" data-appointment-id="${appointment.AppointmentID}">Edit</button>
                        <button class="delete-btn" data-appointment-id="${appointment.AppointmentID}">Delete</button>
                    `;
                        appointmentsList.appendChild(appointmentElement);
                    });
                } else {
                    appointmentsList.innerHTML = "<p>No future appointments found.</p>";
                }
            })
            .catch(error => console.error('Error fetching appointments:', error));
    }

    function isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateString.match(regex)) return false;

        const date = new Date(dateString);
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));

        return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
    }
});

// Function to show notification
function showNotification() {
    // Create notification container if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification hidden';

        const checkmarkContainer = document.createElement('div');
        checkmarkContainer.className = 'checkmark-container';

        const checkmarkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkmarkSvg.className = 'checkmark';
        checkmarkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        checkmarkSvg.setAttribute('viewBox', '0 0 52 52');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.className = 'checkmark-circle';
        circle.setAttribute('cx', '26');
        circle.setAttribute('cy', '26');
        circle.setAttribute('r', '25');
        circle.setAttribute('fill', 'none');

        const check = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        check.className = 'checkmark-check';
        check.setAttribute('fill', 'none');
        check.setAttribute('d', 'M14 27l7 7 15-15');

        checkmarkSvg.appendChild(circle);
        checkmarkSvg.appendChild(check);
        checkmarkContainer.appendChild(checkmarkSvg);

        const message = document.createElement('p');
        message.textContent = 'Appointment Updated Successfully!';

        notification.appendChild(checkmarkContainer);
        notification.appendChild(message);

        document.body.appendChild(notification);
    }

    // Show notification
    notification.classList.remove('hidden');
    notification.classList.add('show');

    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hidden');
    }, 3000);
}