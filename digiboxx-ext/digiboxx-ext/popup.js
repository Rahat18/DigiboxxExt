// popup.js

//To display username on the popup when the user successfully login
function DisplayUsername(){
  if(localStorage.getItem('token')){
    document.getElementById('form').style.display = "none"
    document.getElementById('details').style.display = "block"
    document.getElementById('loggedIn').innerText =  "You are logged in as" + " " +localStorage.getItem('email')
  } else{
    document.getElementById('form').style.display = "block"
    document.getElementById('details').style.display = "none"
  }
}
DisplayUsername()
document.addEventListener('DOMContentLoaded', function () {
  var loginForm = document.getElementById('login-form');
  var errorMessage = document.getElementById('error-message');

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    // Make API request to login and store token
    fetch('https://apitest.digiboxx.com/dgb_login_func/dgb_user_login_post_fn/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        logUsername: email,
        logUserpass: password,
        force_delete_sessions: 1
      })
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Invalid email or password');
        }
        return response.json();
      })
      .then(function (data) {
        // Store token in local storage or somewhere else
        // window.close();
        console.log(data)

        console.log('Token:', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        DisplayUsername()
        console.log('Token:', data.token);
        chrome.storage.local.set({ token: data.token }, function () {
          console.log("Token stored");
          createFolder(data.token)
        });
        
      })
      .catch(function (error) {
        errorMessage.textContent = error.message;
      });
  });
});
// document.getElementById('redirect').addEventListener('click' , function(){
//   chrome.tabs.create({
//     url: "https://apptest.digiboxx.com/landing-page/uploads"
//   })
// })

//Logout func
document.getElementById('logout').addEventListener('click' , function(){
  fetch('https://apitest.digiboxx.com/dgb_user_func/dgb_user_logout_fn/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_token: localStorage.getItem('token')
    })
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Error occured while logging out');
      }
      return response.json();
    })
    .then(function (data) {
     localStorage.removeItem("token");
     localStorage.removeItem("email");
     chrome.storage.local.remove("token");
     chrome.storage.local.remove("email");
     DisplayUsername();
       window.close();
      console.log(data)

    })
    .catch(function (error) {
      errorMessage.textContent = error.message;
    });

} )
 
function createFolder(token ) {
  return new Promise((resolve, reject) => {

    const folderData = new FormData();
    folderData.append("folder_id", "0");
    folderData.append("folderName","Chrome Scrapbook");
    folderData.append("is_resource","0");
    folderData.append("checkbox_folder_parent","0");
    folderData.append("folder_color",null);

   
    fetch("https://apitest.digiboxx.com/dgb_asset_folder_mgmt_func/dgb_create_folder_post_fn/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-request-referrer": "https://apitest.digiboxx.com/"
      },
      body: folderData
    }).then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();

    }).then(data => {
      localStorage.setItem("folder_created" , data.folder_created)

      chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 
      resolve(data);
    }).catch(error => {
      reject(error);
    });
  });
}
