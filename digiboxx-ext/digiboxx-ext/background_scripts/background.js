 var WebsiteUrl = 'https://apitest.digiboxx.com/'

// https://stackoverflow.com/questions/30999159/in-chrome-extension-change-referrer-for-ajax-requests-sent-to-certain-domain
const randomId = Math.floor(Math.random() * 1000000);
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
      "id": randomId,
      "priority": 1,
      "action": {
          "type": "modifyHeaders",
          "requestHeaders": [
               { "header": "Referer", "operation": "set", "value": "https://chromeext.digiboxx.com" },
              // { "header": "Referer", "operation": "set", "value": "https://desktop.digiboxx.com" }
          ]
      },
      "condition": {
          "urlFilter": "https://apitest.digiboxx.com",
          "resourceTypes": ["xmlhttprequest"] // see available https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#type-ResourceType
      }
  }],
});

const storage = chrome.storage;
// Get the token from local storage
function getToken() {
  return new Promise((resolve, reject) => {
    storage.local.get("token", function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        // console.log(result.token)
        resolve(result.token);
      }
    });
  });
}
var topIcon = storage.local.get("token")? "icon.png" : "disabled_icon.png";
async function updateExtensionIcon() {
  try {
    const token = await getToken();
    const tokenExists = token !== null && token !== undefined;
    
    if (tokenExists) {
      chrome.action.setIcon({ path: "icon.png" });
    } else {
      chrome.action.setIcon({ path: "../disabled_icon.png" });
    }
  } catch (error) {
    console.error("Error retrieving token:", error);
    // Handle the error here if needed.
  }
}
updateExtensionIcon();

// Listen for changes in the local storage and update the extension icon accordingly
chrome.storage.onChanged.addListener(updateExtensionIcon);
//function to get folder session
function getFolderSession() {
  return new Promise((resolve, reject) => {
    storage.local.get("folder_created", function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.folder_created || result);
      }
    });
  });
}

// DGBX-12711 || Md Yasin Ansari || Payload Encoding, Response Decoding Function created (Start)
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
  // console.log(folderDecodeJWT);
  const [header, payload, signature] = splitToken(token);
  const decodedHeader = urlSafeDecode(header);
  const decodedPayload = urlSafeDecode(payload);
  return { decodedHeader, decodedPayload };
}
// DGBX-12711 || Md Yasin Ansari || Payload Encoding, Response Decoding Function created (End)

//func  to get the upload URL
async function getUploadUrl(token, imageName, newImageName, imageSize, imageExtension) {
  const folder_session = await getFolderSession()
  return new Promise(async (resolve, reject) => {
  
    // DGBX-12711 || Md Yasin Ansari || Updated Payload from formData to Object
    const payload = {
      "file_title": newImageName,
      "file_type": imageExtension,
      "file_size": imageSize,
      "folder_session": folder_session,
      "folder_is_resource": "0",
      "file_name": imageName,
      "digiPath": "",
      "parent_folder": folder_session,
      "replace_file": "0"
    };
    const key = 'dgb_get_minio_url_fn_' + token;
    const encryptedPayload = await folderSignJWT(payload, key);
  
    try {
      // DGBX-12711 || Md Yasin Ansari || Updated Header for Extension
      const response = await fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_get_minio_url_fn/", {
        'method': "POST",
        'headers': {
          "Authorization": `Bearer ${token}`,
          "referrer": "https://chromeext.digiboxx.com",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: encryptedPayload })
      });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

      const responseBody = await response.json();
      const decoded = folderDecodeJWT(responseBody.data); // DGBX-12711 || Md Yasin Ansari || Decode the JWT
      console.log(decoded);
      resolve(decoded.decodedPayload);

    } catch (error) {
        reject(error);
    }
    });
  }

  // func for put method post minio to upload file to api
  function uploadImage(uploadUrl, file) {
    // console.log(file)
    return new Promise((resolve, reject) => {
      // DGBX-12711 || Md Yasin Ansari || Updated Options rather then passing directly to fetch
        const options = {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        };

        fetch(uploadUrl, options)
        .then(response => {
          if (response.ok) {
            resolve(response.text());
                    // console.log("uploadImage FUnction Response: " + response)
          } else {
            reject(response.statusText);
                    // console.warn("uploadImage FUnction Response(reject): " + response)
          }
        })
        .catch(error => reject(error));
    });
  }

  //mime type
  const imageType = {
    '': '.jpeg',
    'image/jpeg': '.jpeg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/pdf' : '.pdf' ,  //changed
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx' ,
     'application/msword' : '.doc' ,
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" for XLSX' : '.xlxs' ,
     'application/vnd.ms-excel' : '.xls',
     'application/vnd.openxmlformats-officedocument.presentationml.presentation' : '.pptx' ,
     'application/vnd.ms-powerpoint' : '.ppt' ,
     'text/plain' : '.txt' ,
     'application/rtf' : '.rtf',
     'text/html': '.html' ,
     'audio/mpeg': '.mp3',
     'audio/wav': '.wav',
     'audio/ogg': '.ogg',
     'video/mp4': '.mp4',
     'video/ogg': '.ogg',
     'video/webm': '.webm'
  }
  // defaultType = 'image/jpeg'
  defaultType = 'application/octet-stream'
// Function to save an image from a URL and return a File object
function downloadImageOnly(url) {
  // console.log(url )
    return new Promise((resolve, reject) => {
      fetch(url).then(response => {
        response.blob().then(blob => {
          // Extract the filename from the URL
          // const name = url.replaceAll('.').split('/')
          console.log(url)
          // const temp = url.split('/');
          const temp = url.split(/[?/]/);
          const name = temp[temp.length - 1];
          // parts = name.split('_');
          parts = name.split(/[_-]/);
          // var imageName = parts.slice(0, -1).join('-');
          console.log(parts)
          console.log(parts[0])
          // console.log(shortImageName)
          // const file =  new File([blob], name[(name.length) - 1] + imageType[blob.type], {
          //   type: blob.type || defaultType,
          // });
          const length = Math.floor(parts.length/2)
          console.log(length)
          const file =  new File([blob], parts.includes(".") ? parts[length] : parts[length] + imageType[blob.type], {
            type: blob.type || defaultType,
          });
          //  console.log(file)
           resolve(file);
        });
      }).catch(error => {
        reject(error);
      });
    });
  }
// function downloadImageOnly(url) {
//    console.log(url )
//     return new Promise((resolve, reject) => {
//       fetch(url).then(response => {
//         response.blob().then(blob => {
//           // Extract the filename from the URL
//           // const name = url.replaceAll('.').split('/')
//           const temp = url.split('/');
//           const name = temp[temp.length - 1];
//           // const file =  new File([blob], name[(name.length) - 1] + imageType[blob.type], {
//           //   type: blob.type || defaultType,
//           // });
//           const file =  new File([blob], name.includes(".") ? name : name + imageType[blob.type], {
//             type: blob.type || defaultType,
//           });
//           //  console.log(file)
//            resolve(file);
//         });
//       }).catch(error => {
//         reject(error);
//       });
//     });
//   }
  
// This is executed when the extension is installed or updated
chrome.runtime.onInstalled.addListener(function () {
  // Add context menu to save images
  chrome.contextMenus.create({
    title: "Save to Digiboxx",
    contexts: ["image" , "link", "selection" , "all"],     
    id: "saveImage",
  });

  // Create sub-context menu: Save directly
  chrome.contextMenus.create({
    title: "➤ Save directly",
    parentId: "saveImage",
    contexts: ["image", "link", "selection" , "all" ,"video", "audio"],
    id: "saveDirectly",
  });

  // Create sub-context menu: Save screenshot
  chrome.contextMenus.create({
    title: "➤ Save screenshot",
    parentId: "saveImage",
    contexts: ["image", "link", "selection" , "all"],
    id: "saveScreenshot",
  });
});
// Function to enable or disable the context menu based on the token availability
async function updateContextMenu() {
  try {
    const token = await getToken();
    const tokenExists = token !== null && token !== undefined;
    
    if (tokenExists) {
      // Token found, enable the context menu.
      chrome.contextMenus.update("saveImage", {
        enabled: true,
        title: "Save to Digiboxx",
      });
    } else {
      // Token not found, disable the context menu and show the message.
      chrome.contextMenus.update("saveImage", {
        enabled: false,
        title: "Save to Digiboxx     Must sign in!",
      });
    }
  } catch (error) {
    console.log("Error retrieving token:", error);
    // Handle the error here if needed.
  }
}

// Call the updateContextMenu function initially to set the state of the context menu
updateContextMenu();

// Listen for changes in the local storage and update the context menu accordingly
chrome.storage.onChanged.addListener(updateContextMenu);


// Add a listener to handle the context menu item click

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "saveDirectly") {
    // Get the token from local storage
    getToken().then(token => {
     
      // Download the image from the URL
      downloadImageOnly(info.srcUrl || info.linkUrl).then(file => {
       console.log(file)
       console.log(info)
        // Extracting infos from the blob
        const fileType = file.type.split("/")[1];
        console.log(fileType)
        const size = file.size;
        const imageName = file.name.split('.')[0];
        // imageName  = imageName.split(/[?#=]/);
      console.log(imageName)
        // Generate a random number for the image name
        const randomNumber = Math.floor(Math.random() * 1000000);
        const newImageName = `${randomNumber}_${imageName}` + '.'+fileType;
         console.log(newImageName)   // shortImage name with extn
        // Get the upload URL from the API
        getUploadUrl(token, imageName, newImageName, size, fileType).then(uploadRes => {
        // console.log(uploadRes)
          // Upload the image to the API
          uploadImage(uploadRes.url, file).then(() => {
// console.log(file)
            // Validate the file
            validateUploadedFile(file, uploadRes, token, fileType, size, imageName, newImageName).then(() => {
              // chrome.notifications.create({
              //   type: "basic",
              //   title: "Image saved",
              //   message: "The image was saved successfully!",
              //   iconUrl: "icon.png"
              // });

              getUploadUrlPost(token, uploadRes, newImageName).then((data)=> {


              
                uploadImage(data.url, file).then((data2) => {
                  // chrome.notifications.create({
                  //   type: "basic",
                  //   title: "Image saved",
                  //   message: data.url,
                  //   iconUrl: "icon.png"
                  // });
                
                  UpdateThumbnail(token , newImageName  , uploadRes).then((data)=>{
                   
                    chrome.notifications.create({
                      type: "basic",
                      title: "File saved",
                      // message: "Saved successfully!",
                      message: "MyBoxx > Chrome Scrapbook",
                      iconUrl: "icon.png"
                    });
                  }).catch(err => {
                  
                    chrome.notifications.create({
                      type: "basic",
                      title: "Error updating thumbnail",
                      message: `An error occurred while updating thumbnail: ${err}`,
                      iconUrl: "icon.png"
                    });
                  })
                }).catch(err => {
                  chrome.notifications.create({
                    type: "basic",
                    title: "Error saving file",
                    message: `An error occurred while uploading thumbnail.`,
                    iconUrl: "icon.png"
                  });
                })
              }).catch(err => {
                chrome.notifications.create({
                  type: "basic",
                  title: "Error saving file",
                  message: `An error occurred while uploading thumbnail.`,
                  iconUrl: "icon.png"
                });
              })
            });
          }).catch(error => {
            chrome.notifications.create({
              type: "basic",
              title: "Error saving file",
              message: `An error occurred while saving the file.`,
              iconUrl: "icon.png"
            });
          });
        }).catch(error => {
          if(error.status_code){
            chrome.notifications.create({
              type: "basic",
              title: "Error getting upload URL",
              message: `An error occurred while getting the upload URL`,
              iconUrl: "icon.png"
            });
          }else {
           networkFails()
          //  console.log("1")
          }
          
        });
      }).catch(error => {
        if(error.status_code){
          chrome.notifications.create({
            type: "basic",
            title: "Error fetching file",
            message: `An error occurred while fetching the file.`,
            iconUrl: "icon.png"
          });
        }
        else {
          // networkFails()
          // console.log("2")
          chrome.notifications.create({
            type: "basic",
            title: "Error",
            message: `Sorry , we could not save your file.Try saving another one.`,
            iconUrl: "icon.png"
          });
         }
        
      });
    });
  } else if (info.menuItemId === "saveScreenshot") {
      chrome.tabs.captureVisibleTab(function (screenshotUrl) {
        console.log("Screenshot URL:", screenshotUrl);
        const base64string = screenshotUrl.split(';base64,')[1];
        const byteCharacters = atob(base64string);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: 'image/jpeg'});
        const file = new File([blob], "screenshot.jpeg");
        const fileType = "jpeg";
        const size = file.size;
        console.log(file)
        // const imageName = "screenshot.jpeg";
        const imageName = file.name.split('.')[0];
        // Generate a random number for the image name
        console.log(imageName)
        const randomNumber = Math.floor(Math.random() * 1000000);
        var newImageName = `${randomNumber}_${imageName}`+ '.'+fileType;
            // imageName=newImageName
            console.log(imageName)
       console.log(newImageName)
        // Get the token from local storage
        getToken().then(token => {
          getUploadUrl(token, imageName, newImageName, size, fileType).then(uploadRes => {
            // Upload the image to the API
            console.log(imageName , newImageName)
            uploadImage(uploadRes.url, file).then(() => {
              // Validate the file
              console.log(imageName , newImageName)
              validateUploadedFile(file, uploadRes, token, fileType, size, imageName, newImageName).then(() => {
                getUploadUrlPost(token, uploadRes, newImageName).then((data)=> {
                  uploadImage(data.url, file).then((data2) => {
                    UpdateThumbnail(token , newImageName  , uploadRes).then((data)=>{
                      console.log(imageName , newImageName)
                      chrome.notifications.create({
                        type: "basic",
                        title: "File saved",
                        // message: "Saved successfully!",
                        message: "MyBoxx > Chrome Scrapbook",
                        iconUrl: "icon.png"
                      });
                    }).catch(err => {
                      chrome.notifications.create({
                        type: "basic",
                        title: "Error updating thumbnail",
                        message: `An error occurred while updating thumbnail: ${err}`,
                        iconUrl: "icon.png"
                      });
                    })
                  }).catch(err => {
                    chrome.notifications.create({
                      type: "basic",
                      title: "Error saving file",
                      message: `An error occurred while uploading thumbnail.`,
                      iconUrl: "icon.png"
                    });
                  })
                }).catch(err => {
                  chrome.notifications.create({
                    type: "basic",
                    title: "Error saving file",
                    message: `An error occurred while uploading thumbnail.`,
                    iconUrl: "icon.png"
                  });
                })
              });
        }).catch(error => {
            if(error.status_code) {
              chrome.notifications.create({
                type: "basic",
                title: "Error fetching file",
                message: `An error occurred while fetching the file.`,
                iconUrl: "icon.png"
              });
            } else {
              networkFails()
              // console.log("3")
            }
          });
        });
      });
    });
  }
});

//func to upload file
  async function validateUploadedFile(file, uploadedData, token, fileType, size, imageName, newImageName) {
  const folder_session = await getFolderSession();
 // DGBX-12711 || Md Yasin Ansari || Converted the form data to a simple object
  const payload = {
    "tag_details1": JSON.stringify([fileType, "ChromeExt"]),
    "user_details": "{}",
    "file_title1": imageName,
    "file_id": uploadedData.file_id.toString(),
    "file_description": file.name,
    "file_size1": size.toString(),
    "file_digiPath": "",
    "folder_session": folder_session,
    "lastModified": file.lastModified.toString(),
    "folder_is_resource": "0",
    "folder_is_downloadale": "1",
    "resource_array": "[]",
    "downloadable_array": "[]",
    "new_folder_name": "",
    "folder_color": "",
    "replace_file": "0",
    "chooseFile1": newImageName
  };
  
  const key = 'dgb_user_file_upload_fn_' + token;
  const encryptedPayload = await folderSignJWT(payload, key); // DGBX-12711 || Md Yasin Ansari || Encrypted Payload
  
  try {
    // DGBX-12711 || Md Yasin Ansari || Updated Options
    const response = await fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_user_file_upload_fn/", {
      'method': "POST",
      'headers': {
        "Authorization": `Bearer ${token}`,
        "referrer": "https://chromeext.digiboxx.com",
      },
      body: JSON.stringify({ data: encryptedPayload })
    });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

    const responseBody = await response.json();  // Get response body as JSON
    const decoded = folderDecodeJWT(responseBody.data); // DGBX-12711 || Md Yasin Ansari || Decrypt the JWT response
    console.log(decoded);
    return decoded.decodedPayload; // DGBX-12711 || Md Yasin Ansari || Return the decrypted payload

  } catch (error) {
    console.error(error);
  }
}


  // func to call minio after file upload
  async function getUploadUrlPost(token, uploadedData, newImageName){
    // DGBX-12711 || Md Yasin Ansari || Updated Payload from formData to Object
    const payload = {
      "file_title": newImageName,
      "file_type": "thumbnail",
      "file_id": uploadedData.file_id.toString()
    };
  
    const key = 'dgb_get_minio_url_fn_' + token;
    const encryptedPayload = await folderSignJWT(payload, key);
  
    try {
      // DGBX-12711 || Md Yasin Ansari || Updated Options
      const response = await fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_get_minio_url_fn/", {
        'method': "POST",
        'headers': {
          "Authorization": `Bearer ${token}`,
          "referrer": "https://chromeext.digiboxx.com",
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: encryptedPayload })
      });
  
        if (!response.ok) {
          throw new Error(response.statusText);
        }
  
      const responseBody = await response.json();  
      const decoded = folderDecodeJWT(responseBody.data); // // DGBX-12711 || Md Yasin Ansari || Decrypted the JWT response
      return decoded.decodedPayload;
  
    } catch (error) {
      console.error(error);
    }
  }
 
//func for updating thumbnail once file is saved
async function UpdateThumbnail(token , imageName  , uploadedData) {
  // DGBX-12711 || Md Yasin Ansari || Updated Payload from formData to Object
  const payload = {
    "file_id": uploadedData.file_id.toString(),
    "file_name": imageName
  };
    
  const key = 'dgb_update_thumbnail_fn_' + token;
  const encryptedPayload = await folderSignJWT(payload, key);
  
  try {
    // DGBX-12711 || Md Yasin Ansari || Updated options to send object payload
    const response = await fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_update_thumbnail_fn/", {
      'method': "POST",
      'headers': {
        "Authorization": `Bearer ${token}`,
        "referrer": "https://chromeext.digiboxx.com",
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: encryptedPayload })
    });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

    const responseBody = await response.json();
    const decoded = folderDecodeJWT(responseBody.data); // // DGBX-12711 || Md Yasin Ansari || Decrypt the JWT response
    console.log("yasinnnnnnnnnnnnnnnnnnnnnn" + JSON.stringify(decoded.decodedPayload))
    return decoded.decodedPayload;

  } catch (error) {
    console.error(error);
  }
}


//  funct to logout the user from the extension if any other active session is found
  function ActiveSession(){
   
  
    setInterval(()=>{
      getToken().then(token => {
        fetch('https://apitest.digiboxx.com/heartbeat/' ,{
          method: "POST",
        headers:{
         "accept": "application/json",
               "Authorization": `Bearer ${token}`,
               "x-request-referrer": "https://apitest.digiboxx.com/"
        },
        body:JSON.stringify({})
     
        }).then(data =>{
          // console.log(data)
         return data.json()
        }).then(data =>{
          if(data.message == "Token Expired") {
            // localStorage.removeItem("token");
            // localStorage.removeItem("email");
            chrome.storage.local.remove("token");
            chrome.storage.local.remove("email");
          }
        }).catch(error =>{
        //  console.log(error.message);
        })
      })
  
    } , 5000)
  }
   
   ActiveSession()

   function networkFails(){
    chrome.notifications.create({
      type: "basic",
      // title: "DigiBoxx unreachable",
      title: "You are offline.",
      // message: "We could not reach DigiBoxx. The network could be down or busy. Please try again in a minute.",
      message: "We could not reach DigiBoxx.Please check your connection.",
      iconUrl: "icon.png"
    });

   }