const token = localStorage.getItem("token");
chrome.runtime.sendMessage({ token: token });
