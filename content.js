// If you change this, also change it in options.js
var defaultcolorjson = {
  ".*LLC.*": "Orange",
  ".*acqa.*": "Purple",
  ".*dasdigitalplatform-dev.*": "mediumpurple",
  ".*dasdigitalplatform-?(?!dev).*": "darkolivegreen",
  ".*gov.*": "blue",
  ".*prime.*": "Orange",
  ".*prod.*": "darkred"
};

window.addEventListener("load", function () {
  const { hostname, pathname } = window.location;
  if (hostname.endsWith(".awsapps.com") && (pathname.startsWith("/start") || pathname.startsWith("/directory"))) {
    // AWS SSO portal
    saveDataOnSSOAppExpansion();
    console.debug("Detected AWS SSO portal, saving account names and profiles.");
  } else if (
    hostname.includes("console.aws.amazon.com") ||
    hostname.includes("console.amazonaws-us-gov.com") ||
    hostname.includes("health.aws.amazon.com")
  ) {
    // AWS Console (including PHD)
    changeConsoleHeaderAndFooter();
    console.debug("Detected AWS Console, changing header and footer.");
  }
});

// Helper function for waiting until an element selection has been rendered.
function onElementReady(selectorFn, fn) {
  console.debug("Waiting for element to be ready...");
  let timedOut = false;
  setTimeout(function () {
    timedOut = true;
  }, 30000);
  const waitForElement = function () {
    if (timedOut) {
      fn(new Error("Element selection timed out."));
      return;
    }
    const selection = selectorFn();
    //console.debug("Element selection:", selection);
    const firstEl = Array.isArray(selection) ? selection[0] : selection;
    firstEl
      ? fn(undefined, selection)
      : window.requestAnimationFrame(waitForElement);
  };
  waitForElement();
}

function saveDataOnSSOAppExpansion() {
  // Finds the SSO portal app for AWS account selection and adds a click
  // handler that will save the account names and profiles to local storage.
  const awsAccountsAppSelector = () =>
    Array.from(document.querySelectorAll("div[data-testid=account-list]")).find((el) => {
      return true;
    });
  console.debug("Waiting for AWS Accounts app to be ready...");
  onElementReady(awsAccountsAppSelector, function (err, awsAccountsApp) {
    if (err) {
      console.error(err);
      return;
    }
    function onClickHandler() {
      // awsAccountsApp.removeEventListener("click", onClickHandler);
      console.debug("AWS Accounts app clicked, saving account names and profiles.");
      saveAccountNames();
    }
    console.debug("AWS Accounts app is ready, adding click handler.");
    awsAccountsApp.addEventListener("click", onClickHandler);
  });
}


function saveAccountNames() {
  console.debug("Attempting to save account names and IDs...");
  const accountsSelector = () =>
    Array.from(document.querySelectorAll("[data-testid=account-list-cell]"));
  onElementReady(accountsSelector, function (err, accountElements) {
    if (err) {
      console.error(err);
      return;
    }
    console.debug("Found account elements:", accountElements);
    const accountMap = accountElements.reduce((map, el) => {
      const name = Array.from(el.querySelectorAll("span")).find(x=> x.children.length == 0).innerText
      const accountId = Array.from(el.querySelectorAll("span")).find(x=> x.children.length == 0 && !isNaN(x.innerText)).innerText
      console.debug(`Saving account: ${accountId} - ${name}`);
      map[accountId] = name;
      return map;
    }, {});

    chrome.runtime.sendMessage(
      { method: "saveSSOData", data: accountMap },
      function (response) {
        console.log("Saved SSO data to LocalStorage for Console augmentation.");
      }
    );
  });
}

function changeConsoleHeaderAndFooter() {
  console.debug("Changing AWS Console header and footer...");
  const consoleFederatedLoginPattern = /AWSReservedSSO_(.+)_(.+)/;
  // show AWS SSO data to AWS console header
  chrome.runtime.sendMessage({ method: "getSSOData" }, function (response) {
    if (!(response && response.data)) {
      return;
    }
    const accountMap = response.data.data;
    console.debug("Retrieved account map from backend:", accountMap);
    const labelSelector = () =>
      document.querySelector(
        "span[data-testid='awsc-nav-account-menu-button']"
      );

    onElementReady(labelSelector, function (err, label) {
      if (err) {
        // console.warn("Ending SSO title update attempts.");
        return;
      }

      label = label.querySelector("span");

      const accountIdDivSelector = () =>
        document.querySelector("div[data-testid='account-detail-menu']");

      onElementReady(accountIdDivSelector, function (err, accountIdDiv) {
        if (err) {
          return;
        }

        const accountIds = accountIdDiv.querySelectorAll("span");

        var accountId = "";
        const isNumberRegexp = new RegExp(/^[0-9]+(\.[0-9]+)?$/);
        for (span of accountIds) {
          const accountIdTmp = span.innerText.replaceAll("-", "");
          if (isNumberRegexp.test(accountIdTmp) && accountIdTmp.length == 12) {
            accountId = accountIdTmp;
            break;
          }
        }
        if (!accountId) {
          return;
        }

        var roleName = "";
        for (span of accountIds) {
          const accountDetail = span.innerText
            .split("/")[0]
            .match(consoleFederatedLoginPattern);
          if (accountDetail && accountDetail.length > 1) {
            roleName = accountDetail[1];
            break;
          }
        }
        if (!roleName) {
          return;
        }

        const accountName = accountMap[accountId];
        const text = `SSO: ${roleName} @ ${accountName} (${accountId})`;
        label.innerText = text;

        chrome.storage.local.get("ce_aws_sso_colors", function (items) {
          var colors = defaultcolorjson;
          if (items.ce_aws_sso_colors) {
            colors = items.ce_aws_sso_colors;
          }
          for (var regexp in colors) {
            re = new RegExp(regexp);
            console.debug(`Checking if account name ${accountName} matches RegEx: ${regexp}`);
            if (re.test(accountName)) {
              const headerSelector = () =>
                document.querySelector("header").querySelector("nav");
              onElementReady(headerSelector, function (err, header) {
                if (err) {
                  return;
                }
                header.style.backgroundColor = colors[regexp];
              });
              const footerSelector = () =>
                document.querySelector("div[id='console-nav-footer-inner']");
              onElementReady(footerSelector, function (err, footer) {
                if (err) {
                  return;
                }
                footer.style.backgroundColor = colors[regexp];
              });
            }
          }
        });
      });
    });
  });
}
