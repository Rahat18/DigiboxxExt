const storage = chrome.storage;
// Get the token from local storage
function getToken() {
  return new Promise((resolve, reject) => {
    storage.local.get("token", function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.token);
      }
    });
  });
}
//function to get folder session
function getFolderSession() {
  return new Promise((resolve, reject) => {
    storage.local.get("folder_created", function (result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.folder_created);
      }
    });
  });
}
//
async function getUploadUrl(token, imageName, newImageName, imageSize, imageExtension) {
  const folder_session = await getFolderSession()
    return new Promise((resolve, reject) => {
  
      const minioData = new FormData();
      minioData.append("file_title", newImageName);
      minioData.append("file_type", imageExtension);
      minioData.append("file_size", imageSize);
      // minioData.append("folder_session","270970");
      minioData.append("folder_session",folder_session);
      minioData.append("folder_is_resource", "0");
      minioData.append("file_name", imageName);
      minioData.append("digiPath", "");
      minioData.append("parent_folder", folder_session);
      minioData.append("replace_file", "0");
  
      // Send a POST request to the API to get the upload URL
      fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_get_minio_url_fn/", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-request-referrer": "https://apitest.digiboxx.com/"
        },
        body: minioData
      }).then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      }).then(data => {
        console.log(data)
        resolve(data);
      }).catch(error => {
        reject(error);
      });
    });
  }

  function uploadImage(uploadUrl, file) {
    console.log(file)
    return new Promise((resolve, reject) => {
      fetch(uploadUrl, {method: 'PUT', body: file})
        .then(response => {
          if (response.ok) {
            console.log(response)
            resolve(response.text());
          } else {
            reject(response.statusText);
          }
        })
        .catch(error => reject(error));
    });
  }
  //mime type
  const imageType = {
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
     'text/html': '.html'
  }
  defaultType = 'image/jpeg'

// Function to download an image from a URL and return a File object
function downloadImageOnly(url  ) {
  // console.log(url )
    return new Promise((resolve, reject) => {
      fetch(url).then(response => {
        response.blob().then(blob => {
          // Extract the filename from the URL
          const name = url.replaceAll('.').split('/')
          const file =  new File([blob], name[(name.length) - 1] + imageType[blob.type], {
            type: blob.type || defaultType,
          });
           console.log(file)
           resolve(file);
        });
      }).catch(error => {
        reject(error);
      });
    });
  }
  
// This is executed when the extension is installed or updated
chrome.runtime.onInstalled.addListener(function () {
  // Add context menu to save images
  chrome.contextMenus.create({
    title: "Save to Digiboxx",
    contexts: ["image" , "link"],     
    id: "saveImage",
  });
});

// Add a listener to handle the context menu item click

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log(info)
  if (info.menuItemId === "saveImage") {
    // Get the token from local storage
    getToken().then(token => {
     
      // Download the image from the URL
      downloadImageOnly(info.srcUrl || info.linkUrl).then(file => {
      console.log(file)
        // Extracting infos from the blob
        const fileType = file.type.split("/")[1];
        const size = file.size;
        const imageName = file.name

        // Generate a random number for the image name
        const randomNumber = Math.floor(Math.random() * 1000000);
        const newImageName = `${randomNumber}_${imageName}`;

        // Get the upload URL from the API
        getUploadUrl(token, imageName, newImageName, size, fileType).then(uploadRes => {
        console.log(uploadRes)
          // Upload the image to the API
          uploadImage(uploadRes.url, file).then(() => {
console.log(file)
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
                      message: "Saved successfully!",
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
                    title: "Error uploading image",
                    message: `An error occurred while uploading thumbnail 2: ${err}`,
                    iconUrl: "icon.png"
                  });
                })
              }).catch(err => {
                chrome.notifications.create({
                  type: "basic",
                  title: "Error saving file",
                  message: `An error occurred while uploading thumbnail: ${err}`,
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
          chrome.notifications.create({
            type: "basic",
            title: "Error getting upload URL",
            message: `An error occurred while getting the upload URL`,
            iconUrl: "icon.png"
          });
        });
      }).catch(error => {
        chrome.notifications.create({
          type: "basic",
          title: "Error fetching image",
          message: `An error occurred while fetching the image.`,
          iconUrl: "icon.png"
        });
      });
    });
  }
});

//func to upload file
  async function validateUploadedFile(file, uploadedData, token, fileType, size, imageName, newImageName) {
    const folder_session = await getFolderSession()
  
    const fileUploadData = new FormData();
    const extension = [fileType]
    fileUploadData.append("tag_details1", JSON.stringify(extension));
    fileUploadData.append("user_details", "{}");
    fileUploadData.append("file_title1", imageName);
    fileUploadData.append("file_id", uploadedData.file_id.toString());
    fileUploadData.append("file_description", file.name);
    fileUploadData.append("file_size1", size.toString());
    fileUploadData.append("file_digiPath", "");
    // fileUploadData.append("folder_session", "270970");  
    fileUploadData.append("folder_session", folder_session);  
    fileUploadData.append("lastModified", file.lastModified.toString());
    fileUploadData.append("folder_is_resource", "0");
    fileUploadData.append("folder_is_downloadale", "1");
    fileUploadData.append("resource_array", "[]");
    fileUploadData.append("downloadable_array", "[]");
    fileUploadData.append("new_folder_name", "");
    fileUploadData.append("folder_color", "");
    fileUploadData.append("replace_file", "0");
    fileUploadData.append("chooseFile1", newImageName);
  
    return fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_user_file_upload_fn/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-request-referrer": "https://apitest.digiboxx.com/"
      },
      body: fileUploadData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    });
  }
  // func to call minio after file upload
  function getUploadUrlPost(token, uploadedData, newImageName){
    
 
    return new Promise((resolve, reject) => {
  
      const minioData = new FormData();
      minioData.append("file_title", newImageName);
      minioData.append("file_type", "thumbnail");
      minioData.append("file_id",uploadedData.file_id.toString() );
  
      // Send a POST request to the API to get the upload URL
      fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_get_minio_url_fn/", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-request-referrer": "https://apitest.digiboxx.com/"
        },
        body: minioData
      }).then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      }).then(data => {
        resolve(data);
      }).catch(error => {
        reject(error);
      });
    });
  }
 
//func for updating thumbnail once file is saved
  function UpdateThumbnail(token , imageName  , uploadedData) {
 
    return new Promise((resolve, reject) => {
    const UpdateThumbnailData = new FormData();
    UpdateThumbnailData.append("file_id", uploadedData.file_id.toString());
    UpdateThumbnailData.append("file_name", imageName);
    
  
    return fetch("https://apitest.digiboxx.com/dgb_asset_file_mgmt_func/dgb_update_thumbnail_fn/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-request-referrer": "https://apitest.digiboxx.com/"
      },
      body: UpdateThumbnailData
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    }).then(data => {
      resolve(data);
    }).catch(error => {
      reject(error);
    });;
  })
  }
   
