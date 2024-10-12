document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.adminApp-close-btn');
    const updateButton = document.querySelector('#adminApp-updateButton');
    const modalAppointmentId = document.querySelector('#adminApp-modal-appointmentId');
    const modalCustomerId = document.querySelector('#adminApp-modal-customerId');
    const modalDate = document.querySelector('#adminApp-modal-date');
    const modalTime = document.querySelector('#adminApp-modal-time');
    const modalServiceCode = document.querySelector('#adminApp-modal-serviceCode');
    const modalCarPlateNumber = document.querySelector('#adminApp-modal-carPlateNumber');
    const modalCustomerName = document.querySelector('#adminApp-modal-customerName');
    const modalCustomerEmail = document.querySelector('#adminApp-modal-customerEmail');
    const editAppointmentModal = document.getElementById('editAppointmentModal');
    const appointmentsList = document.getElementById('appointments-list'); // Assuming you have this element in your HTML

    // Fetch appointments by shopId
    async function fetchAppointments() {
        const shopId = localStorage.getItem('shopId');

        if (!shopId) {
            console.error("No shop ID found in local storage.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/appointments.php?ShopID=${shopId}`);
            const data = await response.json();

            console.log("Fetched Data:", data); // Log the fetched data

            if (data.success) {
                appointmentsList.innerHTML = ''; // Clear current appointments
                data.data.forEach(appointment => {
                    const appointmentItem = document.createElement('div');
                    appointmentItem.className = 'appointment-item';
                    appointmentItem.innerHTML = `
                    <div><strong>Appointment ID: </strong> ${appointment.AppointmentID}</div>
                    <div><strong>Customer Name: </strong> ${appointment.CustomerName}</div>
                    <div><strong>Email: </strong> ${appointment.CustomerEmail}</div>
                    <div><strong>Service Code: </strong>${appointment.ServiceCode}</div>
                    <div><strong>Date & Time: </strong> ${appointment.Date} at ${appointment.Time}</div>
                    <div><br></div>
                    <button class="edit-app-btn" data-appointment-id="${appointment.AppointmentID}" data-customer-id="${appointment.CustomerID}">Edit</button>
                    <button class="delete-app-btn" data-appointment-id="${appointment.AppointmentID}" data-customer-id="${appointment.CustomerID}">Delete</button>
                `;
                    appointmentsList.appendChild(appointmentItem);
                });
                // Attach edit buttons after appointments are fetched
                attachEditButtons();
                // Attach delete buttons after appointments are fetched
                attachDeleteButtons();
            } else {
                console.error("Failed to fetch appointments:", data.message);
            }
        } catch (error) {
            console.error("Error fetching appointments:", error);
        }
    }

    function attachEditButtons() {
        const editButtons = document.querySelectorAll('.edit-app-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                const customerId = event.target.getAttribute('data-customer-id');
                console.log("Edit button clicked for Appointment ID:", appointmentId); // Debug log
                fetchAppointmentDetails(appointmentId, customerId); // Only called when button is clicked
            });
        });
    }

    function attachDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-app-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const appointmentId = event.target.getAttribute('data-appointment-id');
                const customerId = event.target.getAttribute('data-customer-id');
                deleteAppointment(appointmentId, customerId);
            });
        });
    }

    // Fetch appointment details and show the modal
    function fetchAppointmentDetails(appointmentId) {
        const shopId = localStorage.getItem('shopId'); // Get shopId here
        fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/appointments.php?AppointmentID=${appointmentId}`)
            .then(response => {
                return response.json(); // Parse response as JSON directly
            })
            .then(data => {
                if (data) {
                    const appointment = data; // No need for data.data since the response structure is flat
                    // Fill modal fields
                    modalAppointmentId.value = appointment.AppointmentID;
                    modalCustomerId.value = appointment.CustomerID;
                    modalDate.value = appointment.Date;
                    modalTime.value = appointment.Time;
                    modalServiceCode.value = appointment.ServiceCode;
                    modalCarPlateNumber.value = appointment.CarPlateNumber;
                    modalCustomerName.value = appointment.CustomerName;
                    modalCustomerEmail.value = appointment.CustomerEmail;

                    // Show the modal
                    editAppointmentModal.style.display = 'block'; // Show modal
                } else {
                    console.error('Failed to fetch appointment details:', data.message);
                }
            })
            .catch(error => console.error('Error fetching appointment details:', error));
    }

    // Close modal function
    closeBtn.addEventListener('click', function() {
        editAppointmentModal.style.display = 'none'; // Hide modal
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('editAppointmentModal');
        if (event.target == modal) {
            modal.style.display = 'none'; // Hide the modal
        }
    });

    // Initial fetch
    fetchAppointments(); // Call fetchAppointments when the page loads

    updateButton.addEventListener('click', () => {
        const appointmentId = modalAppointmentId.value;
        const customerId = modalCustomerId.value;
        const date = modalDate.value;
        const time = modalTime.value; // Ensure this input exists
        const serviceCode = modalServiceCode.value;
        const carPlateNumber = modalCarPlateNumber.value;
        const customerName = modalCustomerName.value;
        const customerEmail = modalCustomerEmail.value;
        const shopId = localStorage.getItem('shopId'); // Get shopId here

        const appointmentData = {
            ShopID: shopId,
            AppointmentID: appointmentId,
            CustomerID: customerId,
            Date: date,
            Time: time,
            ServiceCode: serviceCode,
            CarPlateNumber: carPlateNumber,
            CustomerName: customerName,
            CustomerEmail: customerEmail
        };

        // Log each field to debug
        Object.entries(appointmentData).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });

        console.log('Sending appointment data:', appointmentData); // Debug log

        fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/appointments.php`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        })
            .then(response => {
                console.log("Response Status:", response.status); // Log response status
                return response.text(); // Change this to text to get the raw response
            })
            .then(text => {
                try {
                    const data = JSON.parse(text); // Attempt to parse the JSON
                    console.log('Response Data:', data); // Log the response data
                    if (data.success) {
                        fetchAppointments(); // Refresh the appointments list
                        editAppointmentModal.style.display = 'none'; // Hide the modal
                        showNotification('Appointment updated successfully!');
                    } else {
                        console.error('Failed to update appointment:', data.message);
                    }
                } catch (error) {
                    console.error('Error parsing response:', error);
                    console.error('Raw response:', text); // Log the raw response for debugging
                }
            })
            .catch(error => console.error('Error updating appointment:', error));

    });


    function deleteAppointment(appointmentId, customerId) {
        const shopId = localStorage.getItem('shopId'); // Get shopId here
        const confirmation = confirm('Are you sure you want to delete this appointment?');
        if (confirmation) {
            fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/appointments.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ShopID: shopId,
                    AppointmentID: appointmentId,
                    CustomerID: customerId
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        fetchAppointments(); // Refresh the appointments list
                    } else {
                        console.error('Failed to delete appointment:', data.message);
                    }
                })
                .catch(error => console.error('Error deleting appointment:', error));
        }
    }

    // Initial fetch
    fetchAppointments(); // Call fetchAppointments when the page loads

    // Set up date picker for minimum and maximum dates
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = today.getFullYear();

    // Format date to YYYY-MM-DD
    const minDate = `${yyyy}-${mm}-${dd}`;
    modalDate.setAttribute('min', minDate); // Set minimum date to today

    // Set maximum date to a far future date (optional)
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 1); // 1 year in the future
    const futureDD = String(futureDate.getDate()).padStart(2, '0');
    const futureMM = String(futureDate.getMonth() + 1).padStart(2, '0');
    const futureYYYY = futureDate.getFullYear();
    const maxDate = `${futureYYYY}-${futureMM}-${futureDD}`;
    modalDate.setAttribute('max', maxDate); // Set maximum date to 1 year in the future

    // Event listeners for date change
    modalDate.addEventListener('change', () => {
        const selectedDate = modalDate.value;
        console.log('Selected date:', selectedDate); // Debug log
        fetchAvailableSlots(selectedDate); // Call to fetch available slots
    });
});
async function fetchAvailableSlots(selectedDate) {
    const shopId = localStorage.getItem('shopId');

    if (!shopId) {
        console.error("No shop ID found in local storage.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/appointments.php?ShopID=${shopId}&Date=${selectedDate}`);

        // Log the response status for debugging
        console.log('Response status:', response.status);

        // Check if the response is OK (status in the range 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // Log the API response for debugging

        // Check if the expected data structure is received
        if (data && Array.isArray(data.available_slots)) { // Ensure available_slots is an array
            const slotsContainer = document.querySelector('#available-slots-list');
            slotsContainer.innerHTML = ''; // Clear existing slots

            // Populate the available slots
            data.available_slots.forEach(slot => {
                const slotButton = document.createElement('button');
                slotButton.className = 'slot-button';
                slotButton.textContent = slot; // Set button text to the slot time
                slotButton.addEventListener('click', () => {
                    document.querySelector('#adminApp-modal-time').value = slot; // Set the selected time in the modal
                    document.querySelectorAll('.slot-button').forEach(btn => btn.classList.remove('selected')); // Deselect all buttons
                    slotButton.classList.add('selected'); // Highlight the selected button
                });

                slotsContainer.appendChild(slotButton); // Append the button to the slots container
            });
        } else {
            console.error("Failed to fetch available slots: No valid slots received", data.message || "Unknown error");
        }
    } catch (error) {
        console.error("Error fetching available slots:", error);
    }
}
document.querySelectorAll('.adminApp-edit-app-btn').forEach(button => {
    button.addEventListener('click', async () => {
        const appointmentId = button.getAttribute('data-appointment-id');
        const customerId = button.getAttribute('data-customer-id');

        // Populate modal with existing appointment details (if needed)
        document.querySelector('#adminApp-modal-appointmentId').value = appointmentId;
        document.querySelector('#adminApp-modal-customerId').value = customerId;

        // Show modal
        document.getElementById('editAppointmentModal').style.display = 'block';

        // Fetch available slots after opening the modal
        const selectedDate = document.querySelector('#adminApp-modal-date').value; // Use a default or existing date
        await fetchAvailableSlots(selectedDate);
    });
});
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');

    // Remove the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
