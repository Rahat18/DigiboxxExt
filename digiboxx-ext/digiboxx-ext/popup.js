// // popup.js

// //To display username on the popup when the user successfully login
function DisplayUsername(){
  chrome.storage.local.get("token", function (result) {
    if (result.token) {
      document.getElementById('form').style.display = "none"
      document.getElementById('details').style.display = "block"
      document.getElementById('loggedIn').innerText =  "You are logged in as" + " " +localStorage.getItem('email')  
    } else {
      document.getElementById('form').style.display = "block"
      document.getElementById('details').style.display = "none"
    }
  });
}
// document.addEventListener('DOMContentLoaded', function () {
//   var loginForm = document.getElementById('login-form');
//   var errorMessage = document.getElementById('error-message');

//   loginForm.addEventListener('submit', function (event) {
//     event.preventDefault();

//     var email = document.getElementById('email').value;
//     var password = document.getElementById('password').value;

//     // Make API request to login and store token
//     fetch('https://apitest.digiboxx.com/dgb_login_func/dgb_user_login_post_fn/', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         logUsername: email,
//         logUserpass: password,
//         force_delete_sessions: 1
//       })
//     })
//       .then(function (response) {
//         if (!response.ok) {
//           throw new Error('Invalid email or password');
//         }
//         return response.json();
//       })
//       .then(function (data) {
//         // Store token in local storage or somewhere else
//         // window.close();
//         console.log(data)

//         // console.log('Token:', data.token);
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('email', data.email);
//         DisplayUsername()
//         console.log('Token:', data.token);
//         chrome.storage.local.set({ token: data.token }, function () {
//           console.log("Token stored");
//           createFolder(data.token)
//         });
        
//       })
//       .catch(function (error) {
//         errorMessage.textContent = error.message;
//       });
//   });
// });

// //Logout func
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
 
// function createFolder(token ) {
//   return new Promise((resolve, reject) => {

//     const folderData = new FormData();
//     folderData.append("folder_id", "0");
//     folderData.append("folderName","Chrome Scrapbook");
//     folderData.append("is_resource","0");
//     folderData.append("checkbox_folder_parent","0");
//     folderData.append("folder_color",null);

   
//     fetch("https://apitest.digiboxx.com/dgb_asset_folder_mgmt_func/dgb_create_folder_post_fn/", {
//       method: "POST",
//       headers: {
//         "accept": "application/json",
//         "Authorization": `Bearer ${token}`,
//         "x-request-referrer": "https://apitest.digiboxx.com/"
//       },
//       body: folderData
//     }).then(response => {
//       if (!response.ok) {
//         throw new Error(response.statusText);
//       }
//       return response.json();

//     }).then(data => {
//       localStorage.setItem("folder_created" , data.folder_created)

//       chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 
//       resolve(data);
//     }).catch(error => {
//       reject(error);
//     });
//   });
// }
// function TwoFAEnabled(){
//   fetch('https://apitest.digiboxx.com/dgb_login_func/dgb_user_login_post_fn/', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         logUsername: email,
//         logUserpass: password,
//         otp_data: "962278",   //change here
//         force_delete_sessions: 1
//       })
//     })
//       .then(function (response) {
//         if (!response.ok) {
//           throw new Error('Invalid email or password');
//         }
//         return response.json();
//       })
//       .then(function (data) {
        
//         console.log(data)
//         if(data.message === "Valid user"){
//           console.log("2FA login")
//           createFolder(data.token)
//         }
        
//       })
//       .catch(function (error) {
//         errorMessage.textContent = error.message;
//       });
// }

// function TwoFADisabled(){

// }

// function landingPage(){
//   return new Promise((resolve, reject) => {

//     const landingPageData = new FormData();
//     landingPageData.append("page_no", "1");
//     landingPageData.append("type","folder");
//     landingPageData.append("view_type","created_by");
//     landingPageData.append("filter_by_size","");
    
//     landingPageData.append("filter_by_format","");
//     landingPageData.append("filter_by_name","");
//     landingPageData.append("filter_format_type","[]");
//     landingPageData.append("filter_by_tags","[]");
//     landingPageData.append("filter_by_date","");

   
//     fetch("https://apitest.digiboxx.com/dgb_asset_access_func/dgb_user_landing_page_post_fn/", {
//       method: "POST",
//       headers: {
//         "accept": "application/json",
//         "Authorization": `Bearer ${token}`,
//         "x-request-referrer": "https://apitest.digiboxx.com/"
//       },
//       body: folderData
//     }).then(response => {
//       if (!response.ok) {
//         throw new Error(response.statusText);
//       }
//       return response.json();



//     }).then(data => {
//       // localStorage.setItem("folder_created" , data.folder_created)

//       // chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 
//       resolve(data);
//     }).catch(error => {
//       reject(error);
//     });
//   });
// }

function login(email, password, otp) {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        logUsername: email,
        logUserpass: password,
        force_delete_sessions: 1
      }

      if (otp) {
        payload.otp_data = otp;
      }

      console.log(payload);
       localStorage.setItem('email' , payload.logUsername)

      const response = await fetch('https://apitest.digiboxx.com/dgb_login_func/dgb_user_login_post_fn/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  DisplayUsername();

  chrome.storage.onChanged.addListener(() => {
    DisplayUsername();
  });

  // chrome.storage.local.remove("token");

  const otpContainer = document.getElementById('otpContainer');
  const otpField = document.getElementById("otp");

  // Check if two-factor authentication is enabled
  otpContainer.style.display = 'none';
  otpField.required = false;

  var loginForm = document.getElementById('login-form');
  var errorMessage = document.getElementById('error-message');
  // var otp = document.getElementById('otpContainer');

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var loggedInDiv = document.getElementById('loggedIn');
    var otp = document.getElementById('otp')?.value;

    // console.log(otp);

    // Make API request to login and store token
    try {
      const response = await login(email, password, otp);
     console.log(response)
      if (!response.ok) {
        throw new Error('Invalid email or password');
      }
      const data = await response.json();
      
console.log(data)
      // if TFA is not activated, then the users signs in normally
      // given credentials are correct
      if (data.message === "Valid user") {
         localStorage.setItem('token', data.token);
         DisplayUsername()
        chrome.storage.local.set({'token':data.token},function(update)
        { 
          // loggedInDiv.innerText += " " + data.email;
          landingPage( data.token).then(data =>{
            console.log(data)
            var foldername = data.folder_data.filter(val =>{
              return val.folder_name == "Chrome Scrapbook"
            })
            if(foldername.length){
              localStorage.setItem("folder_created" , foldername[0].folder_id)
            chrome.storage.local.set({folder_created : foldername[0].folder_id} , function(){}) 
            }
            else{
              createFolder(data.token)
            }
          })
          
        });
        // console.log(data)
       
       
        

      }
      // if user has TFA activated, then otp will be sent to user
      // we will show the otp field, and again the login api will be called
      else if (data.message === "OTP Send") {
        otpContainer.style.display = 'block';
        otpField.required = true;
         localStorage.setItem('token', data.token);
        // createFolder(data.token)
        // DisplayUsername()
        chrome.storage.local.set({'token':data.token},function(update)
        {  
          landingPage( data.token).then(data =>{
            var foldername = data.folder_data.filter(val =>{
              return val.folder_name == "Chrome Scrapbook"
            })
            if(foldername.length){
              localStorage.setItem("folder_created" , foldername[0].folder_id)
            chrome.storage.local.set({folder_created : foldername[0].folder_id} , function(){}) 
            }
            else{

              createFolder(data.token)
            }
          })
        });
      } else {
        console.log(data);
      }
    } catch(error) {
      errorMessage.textContent = error.message;
    }
  });
});

function createFolder(token) {
  return new Promise((resolve, reject) => {
    // token = localStorage.getItem('token')
// console.log(token)
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
      console.log(data)
      localStorage.setItem("folder_created" , data.folder_created)
      chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 
      resolve(data);
      // console.log(data)
      // if(data.status == "success"){
      //   chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 

      // }else if(data.message =="Folder already exists"){
      //   // console.log("Folder exits with same name") 
      //   landingPage( token) 

      // }else{
      //   console.log("Something went wrong!")
      // }
    }).catch(error => {
      reject(error);
    });
  });
}

 function landingPage( token) {
 
  // const landingPageData = new FormData();
  // landingPageData.append("page_no", "1");
  // landingPageData.append("type", "folder");
  // landingPageData.append("view_type", "created_by");
  // landingPageData.append("filter_by_size", "");
  // landingPageData.append("filter_by_format", "");
  // landingPageData.append("filter_by_name", "");
  // landingPageData.append("filter_format_type", "[]");
  // landingPageData.append("filter_by_tags", "[]");
  // landingPageData.append("filter_by_date", "[]");
  

  return new Promise ((resolve , reject) =>{
    fetch("https://apitest.digiboxx.com/dgb_asset_access_func/dgb_user_landing_page_post_fn/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-request-referrer": "https://apitest.digiboxx.com/"
      },
      body: JSON.stringify({
        page_no: "1",
        type: "folder",
        view_type: "created_by", 
        filter_by_size: "", 
        filter_by_format: "", 
        filter_by_name: "", 
        filter_format_type: "[]", 
        filter_by_tags: "[]", 
        filter_by_date: "", 
         })
    })
    .then(response => {
      // console.log(response.body)
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    }).then(function (data) {
          
              console.log(data)
              resolve(data);
              
            })
            .catch(function (error) {
              // errorMessage.textContent = error.message;
              reject(error);
            });
  }) 
 
}