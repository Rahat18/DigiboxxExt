// // popup.js

// //To display username on the popup when the user successfully login
function DisplayUsername(){
  chrome.storage.local.get("token", function (result) {
    if (result.token) {
      document.getElementById('form').style.display = "none"
      document.getElementById('details').style.display = "block"
      document.getElementById('loggedIn').innerText =  "You are logged in as" + " " +localStorage.getItem('email') 
      document.getElementById('login-button').style.display ="none" 
       document.getElementById('otp').style.display ="none" 
     
    } else {
      document.getElementById('form').style.display = "block"
      document.getElementById('details').style.display = "none"
    }
  });
}


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
      // console.log(data)

    })
    .catch(function (error) {
      errorMessage.textContent = error.message;
    });

} )
 
function base64UrlEncode(str) {
  let base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJWT(payload, secretKey) {
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(dataToSign);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', importedKey, data);
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  const jwtToken = `${dataToSign}.${encodedSignature}`;
  return jwtToken;
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

function decodeJWT(jwtToken) {
  const parts = jwtToken.split('.');
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  return { header, payload };
}

function displayUpgradeModal() {
  upgradeModal.style.display = "block";
}

upgradeButton.addEventListener("click", () => {
  console.log("click")
  window.open("https://test.digiboxx.com/workspace", "_blank");
  // upgradeModal.style.display = "none";
});
// Login func
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

      // console.log(payload);
       localStorage.setItem('email' , payload.logUsername);

      const key = 'dgb_user_login_post_fn_';

      const encrypt_payload = await signJWT(payload, key);

      const response = await fetch('https://apitest.digiboxx.com/dgb_login_func/dgb_user_login_post_fn/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           "x-request-referrer": "https://apptest.digiboxx.com/"
          // "x-request-referrer": "https://chromeext.digiboxx.com"
        },
        body: JSON.stringify({data: encrypt_payload})
      });
      
      const responseJson = await response.json();
      const decoded = decodeJWT(responseJson.data);

      resolve(decoded.payload);
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
  const upgradeModal = document.getElementById("upgradeModal");
    const upgradeButton = document.getElementById("upgradeButton");
  // var otp = document.getElementById('otpContainer');

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var loggedInDiv = document.getElementById('loggedIn');
    var otp = document.getElementById('otp')?.value;

    // // console.log(otp);

    // Make API request to login and store token
    try {
      const response = await login(email, password, otp);
     // console.log(response)
      // if (!response.ok) {
      //   throw new Error('Invalid email or password');
      // }
      const data = response;
      console.log(data);
      if(data.message==='Invalid Password'){
        // document.getElementById('wrongPassword').style.display = "block"
        document.getElementById('wrongPassword').style.display = "flex"
        document.getElementById('wrongPassword').innerText =  data.message_format;  
    } else{
      document.getElementById('wrongPassword').style.display = "none"
    }
    if( data.message == "Invalid credentials"){
      document.getElementById('invalidCredentials').style.display = "flex"
      document.getElementById('invalidCredentials').innerText =  `Invalid email or password`;  
  } else{
    document.getElementById('invalidCredentials').style.display = "none"
  }
    if(data.status_code ===1051){
      console.log(data.message)
      // document.getElementById('upgradePlan').style.display = "block"
      // document.getElementById('upgradePlan').innerText =  "Upgrade to a paid plan for premium service perks."; 
      // displayUpgradePopup();
      // alert("Upgrade to a paid plan for premium service perks.");
      displayUpgradeModal();
    } 
    // document.getElementById('login-button').style.display = "none"
// console.log(data)
      // if TFA is not activated, then the users signs in normally
      // given credentials are correct
      if (data.message === "Valid user") {
         localStorage.setItem('token', data.token);
         DisplayUsername()
        chrome.storage.local.set({'token':data.token},function(update)
        { 
          // loggedInDiv.innerText += " " + data.email;
          landingPage( data.token).then(data =>{
            // console.log(data)
            var foldername = data.folder_data.filter(val =>{
              return val.folder_name == "Chrome Scrapbook"
            }) // If the folder already exists we same files on the existing folder
            if(foldername.length){
              localStorage.setItem("folder_created" , foldername[0].folder_id)
            chrome.storage.local.set({folder_created : foldername[0].folder_id} , function(){}) 
            }  
             // Creating a folder for user
            else{
              // console.log(data)
              token =localStorage.getItem("token")
               createFolder(token)
            }
          })
          
        });
        // // console.log(data)

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
      } 
      else {
        // console.log(data);
      }
    } catch(error) {
      errorMessage.textContent = error.message;
    }
  });
});

// func which creates a folder named Chrome Scrapbook if it's not present 
function createFolder(token) {
  // console.log(token)
  return new Promise((resolve, reject) => {
    // token = localStorage.getItem('token')
// // console.log(token)
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
      // console.log(data)
      localStorage.setItem("folder_created" , data.folder_created)
      chrome.storage.local.set({folder_created : data.folder_created} , function(){}) 
      resolve(data);
    }).catch(error => {
      reject(error);
    });
  });
}

// func to get landing page details, which would let us know if folder named "Chrome Scrapbook" already exists
 function landingPage( token) {
 
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
      // // console.log(response.body)
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    }).then(function (data) {
          
              // console.log(data)
              resolve(data);
              
            })
            .catch(function (error) {
              // errorMessage.textContent = error.message;
              reject(error);
            });
  }) 
 
}