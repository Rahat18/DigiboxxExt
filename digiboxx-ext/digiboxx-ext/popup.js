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
       document.getElementById('digispace').style.display ="none" 
     
    } else {
      document.getElementById('form').style.display = "block"
      document.getElementById('details').style.display = "none"
    }
  });
}
var WebsiteUrl = 'https://apitest.digiboxx.com/' 

// //Logout func
document.getElementById('logout').addEventListener('click' , function(){
  fetch(WebsiteUrl + 'dgb_user_func/dgb_user_logout_fn/', {
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
  window.open("https://apptest.digiboxx.com/subscription", "_blank");
  // upgradeModal.style.display = "none";
});
// Login func
function login(email, password, otp, digispace) {
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
      if (digispace) {
        payload.workspace = digispace;
      }

      // console.log(payload);
       localStorage.setItem('email' , payload.logUsername);

      const key = 'dgb_user_login_post_fn_';

      const encrypt_payload = await signJWT(payload, key);

      const response = await fetch(WebsiteUrl + 'dgb_login_func/dgb_user_login_post_fn/', {
        method: 'POST',
        headers: {
          "referrer": "https://chromeext.digiboxx.com"
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

  const digispaceContainer = document.getElementById('digispaceContainer');
  var digispaceField = document.getElementById('digispace')?.value;


  // Check if two-factor authentication is enabled
  digispaceContainer.style.display = 'none';
  digispaceField.required = false;

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
    var digispace = document.getElementById('digispace')?.value;
    console.log('digispace:', digispace);
    console.log(email, password)
    // // console.log(otp);

    // Make API request to login and store token
    try {
      const response = await login(email, password, otp , digispace);
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
    } else if(response.status_code === 1024) {
      digispaceContainer.style.display = 'block';
      digispaceField.required = true;
    }
     else{
      document.getElementById('wrongPassword').style.display = "none"
    }
    if( data.message == "Invalid credentials"){
      document.getElementById('invalidCredentials').style.display = "flex"
      document.getElementById('invalidCredentials').innerText =  `Invalid email or password`;  
  }
   else{
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
      // if TFA is not activated, then the users signs in normally
      // given credentials are correct
      if (data.message === "Valid user") {
         localStorage.setItem('token', data.token);
         DisplayUsername()
         window.close()
        chrome.storage.local.set({'token':data.token},function(update)
        { 
          // loggedInDiv.innerText += " " + data.email;
          landingPage(data.token).then(data =>{
            console.log(data.decodedPayload.folder_data)
            var foldername = data.decodedPayload.folder_data.filter(val =>{
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
      // else  if(data.status_code === 1024 || data.message ==="more than one account with this email, digispace required"){
      //   console.log("digi")
      //   digispaceContainer.style.display = 'block';
      //   digispace.required = true;
      //    localStorage.setItem('token', data.token);
  
      // }
      else {
        // console.log(data);
      }
    } catch(error) {
      errorMessage.textContent = error.message;
    }
  });
});

// func which creates a folder named Chrome Scrapbook if it's not present 
// Function to encrypt payload and add it to form data
async function encryptPayloadAndSendFormData(payload, secretKey) {
  // Step 1: Convert the payload to a JSON string
  const payloadString = JSON.stringify(payload);

  // Step 2: Generate the JWT token using the signJWT function
  const jwtToken = await signJWT(payloadString, secretKey);

  // Step 3: Create the form data and add the JWT token as a field
  const formData = new FormData();
  formData.append('jwtToken', jwtToken);

  return formData;
}

// Function to decrypt response data
async function decryptResponseData(responseData, secretKey) {
  // The provided function does not include actual decryption logic, so we'll just return the data as it is
  return responseData;
}

// DGBX-12711 || Md Yasin Ansari || Paload Encoding, Response Decoding Function created (Start)
const urlSafeEncode = (data) => btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const generateHeader = () => urlSafeEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const processPayload = (payload) => urlSafeEncode(JSON.stringify(payload));
const createToBeSignedData = (header, payload) => `${header}.${payload}`;
const encodeData = (toBeSigned) => new TextEncoder().encode(toBeSigned);
const importSecretKey = async (secretKey) => {
  const textEncoder = new TextEncoder();
  return await crypto.subtle.importKey('raw', textEncoder.encode(secretKey), { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign']);
};
const signData = async (key, data) => {
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return urlSafeEncode(String.fromCharCode(...new Uint8Array(signature)));
};
async function folderSignJWT(payload, secretKey) {
  const header = generateHeader();
  const processedPayload = processPayload(payload);
  const toBeSigned = createToBeSignedData(header, processedPayload);
  const encodedToBeSigned = encodeData(toBeSigned);
  const importedKey = await importSecretKey(secretKey);
  const urlSafeSignature = await signData(importedKey, encodedToBeSigned);
  return `${toBeSigned}.${urlSafeSignature}`;
}

const urlSafeDecode = (data) => {
  data = data.replace(/-/g, '+').replace(/_/g, '/');

  while (data.length % 4) {
    data += '=';
  }

  return JSON.parse(atob(data));
}

const splitToken = (token) => {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Token structure incorrect');
  }

  return parts;
}

function folderDecodeJWT(token) {
  console.log(folderDecodeJWT);
  const [header, payload, signature] = splitToken(token);
  const decodedHeader = urlSafeDecode(header);
  const decodedPayload = urlSafeDecode(payload);
  return { decodedHeader, decodedPayload };
}
// DGBX-12711 || Md Yasin Ansari || Paload Encoding, Response Decoding Function created (End)


async function createFolder(token) {
  const key = 'dgb_create_folder_post_fn_' + token;
  return new Promise(async (resolve, reject) => {
    try {
      // DGBX-12711 || Md Yasin Ansari || Corrected Payload and refferer
      const folderData = {
        'folder_id': "0",
        'folderName': "Chrome Scrapbook",
        'is_resource': "0",
        'checkbox_folder_parent': "0",
        'folder_color': null,
      };

      // Step 1: Encrypt the payload
      const encryptedFormData = await folderSignJWT(folderData, key);
      console.log("Encrypted Form Data Line 321:" + encryptedFormData);

      // Step 2: Send the encrypted form data in the Fetch API request
      fetch(WebsiteUrl +"dgb_asset_folder_mgmt_func/dgb_create_folder_post_fn/" , {
        'method': "POST",
        'contentType': 'application/json',
        'headers': {
          "Authorization": `Bearer ${token}`,
          "referrer": "https://chromeext.digiboxx.com"
        },
        body: JSON.stringify({data: encryptedFormData})
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(response.statusText);
          }

          // Step 3: Get the response data
          const responseData = await response.text();
          console.log("Encrypted Response Line 340:" + responseData);
          // Step 4: Decrypt the response data (if needed)
          const decryptedData = folderDecodeJWT(responseData, key);
          console.log("Decrypted Response Line 343:" + decryptedData);
          // If the response data is in JSON format, parse it
          const parsedData = JSON.parse(decryptedData);

          // Example: Save parsed data to local storage
          localStorage.setItem("folder_created", JSON.stringify(parsedData.folder_created));

          // Example: Save parsed data to Chrome storage
          chrome.storage.local.set({ folder_created: parsedData.folder_created }, function () {});

          // Resolve the promise with the parsed data
          resolve(parsedData);
        })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function landingPage(token) {
  return new Promise(async (resolve, reject) => {  
    try {
      // DGBX-12711 || Md Yasin Ansari || Corrected Payload and refferer
      var payload = {
        'page_no': 1,
        'type': "folder",
        'view_type': "created_by",
        'filter_by_size': "",
        'filter_by_format': "",
        'filter_by_name': "",
        'filter_format_type': "[]",
        'filter_by_tags': "[]",
        'filter_by_date': "",
      }
      const key = 'dgb_user_landing_page_post_fn_' + token;
      const encrypt_payload = await folderSignJWT(payload, key);
      const response = await fetch(WebsiteUrl + "dgb_asset_access_func/dgb_user_landing_page_post_fn/", {
        'method': "POST",
        'contentType': 'application/json',
        'headers': {
          "Authorization": `Bearer ${token}`,
          "referrer": "https://chromeext.digiboxx.com"
        },
        body: JSON.stringify({ data: encrypt_payload })
      });
      
      const responseJson = await response.json();
      console.log("Response: ", responseJson);
      const decoded = folderDecodeJWT(responseJson.data);
      resolve(decoded);
      console.log(decoded)
    } catch (error) {
      reject(error);
    }        
  })  
}