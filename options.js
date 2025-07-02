// If you change this, also change it in content.js
var defaultcolorjson = {
  ".*LLC.*": "Orange",
  ".*acqa.*": "Purple",
  ".*dasdigitalplatform-dev.*": "mediumpurple",
  ".*dasdigitalplatform-?(?!dev).*": "darkolivegreen",
  ".*gov.*": "blue",
  ".*prime.*": "Orange",
  ".*prod.*": "darkred"
};


function savecolors() {
  var inputjson = document.getElementById("inputjsoncolors").value;

  var colors;
  try {
    colors = JSON.parse(inputjson);
  } catch (e) {
    document.getElementById("mescolors").innerHTML = "invalid json.";
    return;
  }

  chrome.storage.local.set({ ce_aws_sso_colors: colors }, function () {});
  document.getElementById("mescolors").innerHTML = "saved.";
}


function load() {
  chrome.storage.local.get("ce_aws_sso_colors", function (items) {
    var value;
    if (!items.ce_aws_sso_colors) {
      value = JSON.stringify(defaultcolorjson, null, "\t");
    } else {
      value = JSON.stringify(items.ce_aws_sso_colors, null, "\t");
    }
    document.getElementById("inputjsoncolors").value = value;
  });
}

document.addEventListener("DOMContentLoaded", load);

document.getElementById("savebuttoncolors").addEventListener("click", savecolors);
