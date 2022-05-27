const subscriptionKey = "3c67af0f2b654ce0b441ab3c0b185d2a";
const endpoint = "https://instantface.cognitiveservices.azure.com/";
const uriBase = endpoint + "face/v1.0/detect";

const timerText = document.querySelector('.timer');
const vid = document.querySelector('video');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const spinner = document.querySelector('#spinner')
const oneElement = document.getElementById('one');
const answerElement = document.getElementById("answer");
const outputClass = document.querySelector('.output');
const btnctrl = document.querySelectorAll('.btnctrl');
const sizeValue = document.querySelector('#sizeValue');
const ageValue = document.querySelector('#ageValue'); // 'age = '
const fontValue = document.querySelector('#fontValue'); // 'font = '
let timer = 3;
let webcamStream;
let isWebCamOn = false;
let aspectRatio = null;
let faultCount = 0;

btnctrl[1].disabled = true;

function takesnapshot() {
    takeSnap().then(blob => {
        analyseImage(blob, params, showResults);
    })
}

setInterval(() => {
    if (!isWebCamOn) {
        if (timerText.classList.contains('zoomAnimate')) timerText.classList.remove('zoomAnimate')
        return;
    }
    if (!timerText.classList.contains('zoomAnimate')) timerText.classList.add('zoomAnimate')
    if (timer === 0) {
        if (outputClass.style.display == 'none') outputClass.style.display = 'block';
        timer = 3;
        takesnapshot();
    } else timer--;
    timerText.innerHTML = timer;
}, 1000);

// Request parameters.
const params = {
    "returnFaceId": "true",
    "returnFaceLandmarks": "true",
    "returnFaceAttributes": "age,glasses,exposure"
};

// ***********************************************************************
// *** function startWebcam                                           ***
// *** ask permision from user and start webcam, then                 ***
// *** enable the button to take a snapshot                           ***
// ***********************************************************************
function startWebcam() {

    isWebCamOn = true;
    btnctrl[1].disabled = false;


    // request cam
    navigator.mediaDevices.getUserMedia({
        video: true
    }).then(stream => {
        // save stream to letiable at top level so it can be stopped lateron
        webcamStream = stream;
        // show stream from the webcam on te video element
        vid.srcObject = stream;
        // returns a Promise to indicate if the video is playing
        return vid.play();
    }).then(() => {
        // calculating aspect ratio
        aspectRatio = (vid.videoWidth / vid.videoHeight);

        document.querySelectorAll('.changeWidthDyn').forEach(el => {
            el.style.width = ((parseInt(el.style.height) * aspectRatio) + 'em');
        })

    }).catch(e => console.log('error: ' + e));
}

// ***********************************************************************
// *** function takeSnap                                              ***
// *** show snapshotimage from webcam                                 ***
// *** convert image to blob                                          ***
// ***********************************************************************

function takeSnap() {
    // set its size to the one of the video
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;
    // show snapshot on canvas
    ctx.drawImage(vid, 0, 0);
    // show spinner image below
    spinner.classList.remove('hidden');
    return new Promise((res, rej) => {
        // request a Blob from the canvas
        canvas.toBlob(res, 'image/jpeg');
    });
}

// ***********************************************************************
// *** function stopWebcam                                             ***
// *** stop webcam                                                     ***
// *** disable snapshot button                                         ***
// ***********************************************************************

function stopWebcam() {
    isWebCamOn = false;
    btnctrl[1].disabled = true;

    vid.srcObject.getTracks().forEach((track) => {
        track.stop();
    });
}


// ***********************************************************************
// *** function analyseImage                                           ***
// *** analyse image using cognitive services of Microsoft             ***
// *** img - image to analyse                                          ***
// *** params - object containing params to send                       ***
// *** processingFunction - name of function to call to process the response ***
// ***********************************************************************

function analyseImage(image, params, proccessingFunction) {

    // create API url by adding params
    let paramString = Object.entries(params).map(([key, val]) => `${key}=${val}`).join('&');
    let urlWithParams = uriBase + "?" + paramString;

    // do API call
    fetch(urlWithParams, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Ocp-Apim-Subscription-Key": subscriptionKey
        },
        processData: false,
        body: image,
    })
        // then turn response into json
        .then(response => response.json())
        // then go to processingFunction
        .then(json => proccessingFunction(json))
        // show alert window if something goes wrong
        .catch(error => {
            answerElement.innerHTML = ("check if camera is available and your face is clearly visible in camera and refresh the page");
            console.log(error);
            stopTheProg();
        });
}

// Function working with the json

function showResults(json) {

    // hide spinner image onto the canvas
    spinner.classList.add('hidden');
    // show results in responseArea
    document.querySelector('#responseArea').textContent = JSON.stringify(json, null, 2);

    console.log(json);

    if (json[0].faceAttributes.glasses !== 'NoGlasses') {
        answerElement.innerHTML = ("Please remove your specs and restart");
        stopTheProg();
        return;
    }

    if (parseFloat(oneElement.style.fontSize) > 16) {
        answerElement.innerHTML = ("You may need glasses, consult doctor");
        stopTheProg();
        return;
    }

    const expectedEye = json[0].faceRectangle.height * 0.0577464788732394;

    // Eyes are fine
    if (json[0].faceLandmarks.eyeLeftBottom.y - json[0].faceLandmarks.eyeLeftTop.y < expectedEye) {
        answerElement.innerHTML = ("The fontsize is not correct, wait");
        oneElement.style.fontSize = ((parseFloat(oneElement.style.fontSize) + 2) + 'px');
        sizeValue.innerHTML = oneElement.style.fontSize;
    }
    // Your eyes are not fine
    else if (json[0].faceLandmarks.eyeLeftBottom.y - json[0].faceLandmarks.eyeLeftTop.y >= expectedEye) {
        answerElement.classList.remove('answerWrong');
        answerElement.classList.add('answerCorrect');
        answerElement.innerHTML = ("Your eyes are fine");
        answerElement.classList.add("answerCorrect");
        ageValue.innerHTML = 'Expected Age : ' + json[0].faceAttributes.age;
        fontValue.innerHTML = 'Suitable Font : ' + sizeValue.innerHTML;
        stopTheProg();
        return;
    }
}

function stopTheProg() {
    stopWebcam();
    btnctrl.forEach(btn => btn.disabled = true);
}

// Texts to read while taking a screenshot
const displayTextArray = [
    "Microsoft was founded by Bill Gates and Paul Allen on April 4, 1975, to develop and sell BASIC interpreters for the Altair 8800. It rose to dominate the personal computer operating system followed by Microsoft Windows. It has increasingly diversified from the operating system market and has made a number of corporate acquisitions, their largest being the acquisition of LinkedIn for $26.2 billion in December 2016.",
    "Dethroned by Apple in 2010, in 2018 Microsoft reclaimed its position as the most valuable publicly traded company in the world. In April 2019, Microsoft reached the trillion-dollar market cap, becoming the third U.S. public company to be valued at over $1 trillion after Apple and Amazon respectively.",
    "In microsoft logo, orange colour stands for Microsoft’s Office products, green colour for Microsoft Gaming, yellow for Microsoft Hardware and the light blue colour stand for the Windows!!",
    "Satya Nadella, the India-born CEO of Microsoft said that the company is committed to using its resources to support covid pandemic relief efforts in India and is partnering with the US chamber of Commerce and Business to provide critical medical supplies to the country.",
    "Microsoft has been rated the most environmentally friendly company by the nonprofit Just Capital in 2019. It reduced its products packaging by 20% and donated billions in NGOs in 2018. Company uses its AI to address global warming in India, providing software tools to help produce higher crop harvest."
];

oneElement.innerHTML = displayTextArray[Math.floor(Math.random() * displayTextArray.length + 1) - 1];
