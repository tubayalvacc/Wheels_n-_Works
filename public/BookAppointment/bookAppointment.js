// Calendar functionality
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const timeSlotGrid = document.getElementById('timeSlotGrid');
const bookAppointmentBtn = document.getElementById('bookAppointment');

let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;
const shopID = '13'; // Replace with actual shop ID or fetch dynamically

function generateCalendar(year, month) {
    calendarGrid.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // Day of week for the 1st of the month

    currentMonthElement.textContent = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;

    // Add leading empty days
    for (let i = 0; i < startingDay; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'other-month');
        calendarGrid.appendChild(dayElement);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;
        dayElement.dataset.date = new Date(year, month, day).toISOString().split('T')[0]; // Store the date for selection
        dayElement.addEventListener('click', () => selectDate(new Date(year, month, day)));
        calendarGrid.appendChild(dayElement);
    }
}


function selectDate(date) {
    // Create a new date object with the same year, month, and day, but at midnight
    selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    console.log('Selected Date:', selectedDate); // Debug statement

    document.querySelectorAll('.calendar-day').forEach(day => day.classList.remove('selected'));

    const dayIndex = selectedDate.getDate() + new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() - 1;
    const selectedDayElement = document.querySelector(`.calendar-day:nth-child(${dayIndex + 1})`);

    if (selectedDayElement) {
        selectedDayElement.classList.add('selected');
    }

    fetchAvailableSlots(selectedDate);
}

//etch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/fetch_appointments.php?ShopID=${shopID}&Date=${date.toISOString().split('T')[0]}`);
// Function to fetch available and unavailable slots
// Updated fetchAvailableSlots function

console.log('ShopID:', shopID);
function normalizeDate(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}


function fetchAvailableSlots(date) {
    const normalizedDate = normalizeDate(date);
    const formattedDate = normalizedDate.toISOString().split('T')[0];
    console.log('Fetching slots for:', formattedDate);

    fetch(`http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/fetch_appointments.php?ShopID=${shopID}&Date=${formattedDate}`)
        .then(response => response.json())
        .then(data => {
            console.log('Available Slots Data:', data); // Check data structure
            if (data.success) {
                const availableSlots = data.data.available_slots;
                const unavailableSlots = data.data.unavailable_slots;
                generateTimeSlots(availableSlots, unavailableSlots);
            } else {
                console.error('Error fetching slots:', data.message);
                generateTimeSlots([], []);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            generateTimeSlots([], []);
        });
}




// Updated generateTimeSlots function
function generateTimeSlots(availableSlots, unavailableSlots) {
    timeSlotGrid.innerHTML = '';

    // Combine and sort all time slots
    const allSlots = [
        ...availableSlots.map(time => ({ time, available: true })),
        ...unavailableSlots.map(time => ({ time, available: false }))
    ].sort((a, b) => a.time.localeCompare(b.time));

    if (allSlots.length === 0) {
        const noSlotsElement = document.createElement('div');
        noSlotsElement.textContent = 'No time slots available for this date.';
        timeSlotGrid.appendChild(noSlotsElement);
        return;
    }

    allSlots.forEach(slot => {
        const timeSlotElement = document.createElement('div');
        timeSlotElement.classList.add('time-slot');
        if (!slot.available) {
            timeSlotElement.classList.add('unavailable');
        }

        const formattedTime = slot.time.slice(0, 5); // Display only HH:MM
        timeSlotElement.textContent = formattedTime + (slot.available ? '' : ' - Not Available');

        if (slot.available) {
            timeSlotElement.addEventListener('click', () => selectTimeSlot(slot.time));
        }

        timeSlotGrid.appendChild(timeSlotElement);
    });
}

function selectTimeSlot(time) {
    selectedTimeSlot = time;
    document.querySelectorAll('.time-slot').forEach(slot => slot.classList.remove('selected'));
    const selectedSlotElement = Array.from(timeSlotGrid.children).find(
        slot => slot.textContent.startsWith(time.slice(0, 5)) && !slot.classList.contains('unavailable')
    );
    if (selectedSlotElement) {
        selectedSlotElement.classList.add('selected');
    }
}

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
});
function showNotification() {
    const container = document.getElementById('notificationContainer');
    container.style.display = 'block';
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function closeNotification() {
    document.getElementById('notificationContainer').style.display = 'none';
}
function refreshCalendarAndSlots() {
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    if (selectedDate) {
        fetchAvailableSlots(selectedDate);
    }
}
bookAppointmentBtn.addEventListener('click', () => {
    if (selectedDate && selectedTimeSlot) {
        const utcDate = normalizeDate(selectedDate);
        const formattedDate = utcDate.toISOString().split('T')[0];
        const formattedTime = selectedTimeSlot; // Ensure this is in UTC if needed

        const formData = {
            CustomerID: document.getElementById('customerID').value,
            CustomerName: document.getElementById('customerName').value,
            CustomerEmail: document.getElementById('customerEmail').value,
            CarPlateNumber: document.getElementById('carPlateNumber').value,
            ServiceCode: document.getElementById('service').value,
            Date: formattedDate,
            Time: formattedTime,
            ShopID: shopID
        };

        fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/fetch_appointments.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification();
                    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
                    refreshCalendarAndSlots();
                } else {
                    alert('Failed to book appointment: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while booking the appointment.');
            });
    } else {
        alert('Please select a date and time slot.');
    }
});



// Initialize the calendar
generateCalendar(currentDate.getFullYear(), currentDate.getMonth());

// Fetch services and populate the dropdown
document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:8888/VehicleRepairSystem/vehicle-repair-shop/src/api/fetch_services.php')
        .then(response => response.json())
        .then(data => {
            console.log(data); // Check the response structure
            const serviceSelect = document.getElementById('service');
            data.forEach(service => {
                const option = document.createElement('option');
                option.value = service.ServiceCode; // Use ServiceCode from API response
                option.textContent = service.ServiceName; // Use ServiceName from API response
                serviceSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching services:', error);
        });
});

// bookAppointment.js

document.addEventListener('DOMContentLoaded', function() {
    const shopId = 13; // Replace this with the dynamic ShopID if needed
    document.getElementById('shopId').textContent = shopId;
});


function normalizeDate(date) {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));
}

