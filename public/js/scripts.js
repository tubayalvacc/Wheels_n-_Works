// Define showModal function at a higher scope
const showModal = (type) => {
  const dialog = document.getElementById(type);
  if (dialog) {
    console.log(`Opening modal: ${type}`);
    dialog.showModal();

    const handleOutsideClick = (event) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
          rect.top <= event.clientY &&
          event.clientY <= rect.bottom &&
          rect.left <= event.clientX &&
          event.clientX <= rect.right;

      if (!isInDialog) {
        dialog.close();
        console.log(`Closing modal: ${type}`);
      }
    };

    // Attach outside click event
    dialog.addEventListener("click", handleOutsideClick);
  } else {
    console.error(`Element with id ${type} not found.`);
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

      if (!email || !password) {
        alert("Please fill in both fields!");
        return;
      }

      fetch('http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/auth.php?action=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Store user data in local storage
              localStorage.setItem('user', JSON.stringify(data.user));

              showUploadingMessage();
              setTimeout(() => {
                console.log("Login successful, redirecting...");
                window.location.href = '/WDI/WDI-VehicleRepairShop/public/profile.html'; // Ensure this path is correct
              }, 3000);
            } else {
              alert(data.message);
            }
          })
          .catch(error => console.error('Error:', error));
    });
  }

  /// Handle signup form submission
  if (signupForm) {
    signupForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const nameSurname = document.getElementById('signup-name-surname').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      const contactNumber = document.getElementById('signup-contact-number').value.trim();

      if (!nameSurname || !email || !password || !contactNumber) {
        alert("Please fill in all fields!");
        return;
      }

      fetch('http://localhost:8888/WDI/WDI-VehicleRepairShop/src/api/auth.php?action=register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name_surname: nameSurname, email, password, contact_number: contactNumber })
      })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Optionally store user data in local storage
              localStorage.setItem('user', JSON.stringify(data.user));

              showSuccessMessage();


              setTimeout(() => {
                console.log("Signup successful, redirecting to login modal...");
                // Close the signup modal if needed
                const signupDialog = document.getElementById('sign-up');
                if (signupDialog) {
                  signupDialog.close();
                }
                // Open the login modal
                showModal('login');
              }, 3000);
            } else {
              alert(data.message);
            }
          })
          .catch(error => console.error('Error:', error));
    });
  }


  // Show uploading message for login
  function showUploadingMessage() {
    const formContainer = document.querySelector(".login") || document.querySelector(".form-container-signup");
    if (formContainer) {
      formContainer.innerHTML = `
        <h1 style="text-align: center;">Uploading<span id="dots"></span></h1>
      `;
      animateDots();
    } else {
      console.error('Form container not found.');
    }
  }

  // Show success message for signup
  function showSuccessMessage() {
    const successMessage = document.createElement('div');
    successMessage.innerHTML = `
      <h1 style="text-align: center;">Signup Successful!<br>Redirecting...</h1>
    `;
    document.body.appendChild(successMessage);
  }

  // Animate dots during redirection
  function animateDots() {
    const dots = document.getElementById("dots");
    if (dots) {
      let dotCount = 0;
      setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        dots.textContent = ".".repeat(dotCount);
      }, 500);
    } else {
      console.error('Element with id "dots" not found.');
    }
  }

  // Attach event listeners to buttons
  document.getElementById('loginButton').addEventListener('click', () => showModal('login'));
  document.getElementById('signupButton').addEventListener('click', () => showModal('sign-up'));
});
