//region Timeout Variables
const baseTimeout = 1000;
var timeout = baseTimeout;
var speed = 1;
var multiplier = 10;
//#endregion

//region Mode Variable
var IsDemo = false;
let isStandardLayout = false;

let isAutomaticMode = true;
let toggleIntervalId = null;
//#endregion

//region Global Variables
let storedPosition = null; // Store the position globally
let currentTrScreen = 0;

var spedUpDate = new Date();
let lastToggledDate;
const layoutToggleMap = new Map();
let IsSpedUp = false;
//#endregion

//#region Constants
const stateMachine = "Main state machine";
const toggleInterval = 5; //Determines how often the layout toggles

const slider = document.getElementById('timeSlider');
const sliderValueDisplay = document.getElementById('sliderValue');

const TrTimeTable = 'Tr Timetable';
const TrEmergency = 'Tr Emergency';
const TrImages = 'Tr Images';
const TrTransport = 'Tr Transport';
const TrWeather = 'Tr Weather';

const LayoutVTriggerName = 'Tr Layout V';
const LayoutHTriggerName = 'Tr Layout H';

const EnableSkyTriggerName = 'Tr Sky color';
const EnableWeatherEffectsTriggerName = 'Tr Weather effects';
const SkySunnyTriggerName = 'Tr Sunny';
const SkyRainTriggerName = 'Tr Rain';
const trScreens = ['Tr Timetable', 'Tr Emergency', 'Tr Images', 'Tr Transport', 'Tr Weather'];
//#endregion

let inputs = null;

try {
    // Get the canvas element
    const canvas = document.getElementById('rive-canvas');
    const controlsCanvas = document.getElementById('rive-canvas-controls');

    // Create Rive instance
    riveControlsInstance = new rive.Rive({
        src: 'menu_test.riv',
        canvas: controlsCanvas,
        autoplay: true,
        autoBind: true,
        artboard: "Button Testing Main",
        stateMachines: 'State Machine 1', // This ensures that animation is playing
        onLoad: () => {
            console.log('Rive animation loaded successfully');
            // Fit the animation to the canvas
            riveControlsInstance.resizeDrawingSurfaceToCanvas();

            //this is how to access the autobind instance
            let boundInstance = riveInstance.ViewModelInstance;
        },
        onLoadError: (error) => {
            console.error('Failed to load Rive animation:', error);
            alert('Failed to load the Rive animation. Please check if menu_test.riv exists.');
        }
    });

    riveControlsInstance.layout = new rive.Layout({  fit: rive.Fit.Contain,
        alignment: rive.Alignment.Center });

    riveInstance = new rive.Rive({
        src: 'time_main_r5.riv',
        canvas: canvas,
        autoplay: true,
        autoBind: true,
        artboard: "Time Calc H",
        stateMachines: 'Main state machine',
        onLoad: () => {
            console.log('Rive animation loaded successfully');
            riveInstance.resizeDrawingSurfaceToCanvas();

            /* const viewModel = riveInstance.viewModelByIndex(0);
            const viewModelInstance = viewModel.instanceByName('MainInstance');

            riveInstance.bindViewModelInstance(viewModelInstance); */

            const viewModelInstance = riveInstance.viewModelInstance;

            const location = viewModelInstance.string('City Name');
            
            inputs = riveInstance.stateMachineInputs(stateMachine);
            console.log(inputs);

            //Location logic
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        storedPosition = position; // Store the position
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                        const data = await response.json();
                        console.log(data.address.town);
                        const city = data.address.city || data.address.town;
                        location.value = city;
                    },
                    (error) => {
                        navigator.permissions.query({ name: 'geolocation' }).then(async result => {
                            if (result.state === 'granted') {
                                navigator.geolocation.getCurrentPosition(
                                    async (position) => {
                                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                                        const data = await response.json();
                                        console.log(data.address.town);
                                        const city = data.address.city || data.address.town;
                                        location.value = city;
                                    },
                                    (error) => {
                                        console.log('Error Getting Location');
                                    }
                                );
                            } else {
                                // If geolocation is not available, use IP-based location
                                try {
                                    const response = await fetch('https://ipapi.co/json/');
                                    const data = await response.json();
                                    console.log('Geolocation is not available, using IP-based location', data.city);
                                    location.value = data.city;
                                } catch (error) {
                                    console.log('Error Getting Location'); // Fallback to London if IP location fails
                                }
                            }
                        });
                    }
                );
            }

            let date = new Date();
            startAutoToggle(date);

            const minuteInput = viewModelInstance.number('Minute Calc');
            const hourInput = viewModelInstance.number('Hour Calc');

            const yearInput = viewModelInstance.number('Year');
            const monthInput = viewModelInstance.string('Month');
            const dayInput = viewModelInstance.string('Day');
            const dateInput = viewModelInstance.number('Date');

            // --- Time/Date/Weather update function ---
            function updateRiveTimeAndWeather() {
                if (speed !== 1) {
                    date = spedUpDate;
                } else {
                    date = new Date();
                }

                // 24 hour clock
                const minute = date.getMinutes();
                const hour = date.getHours();

                minuteInput.value = minute;
                hourInput.value = hour;

                yearInput.value = date.getFullYear();
                monthInput.value = date.toLocaleString('default', { month: 'long' });
                dayInput.value = date.toLocaleString('default', { weekday: 'long' });
                dateInput.value = date.getDate();

                // Get weather data and update temperature
                const temperatureInput = viewModelInstance.number('Temperature');
                if (storedPosition) { // Use stored position instead of requesting again
                    const lastWeatherUpdate = localStorage.getItem('lastWeatherUpdate') || '0';
                    const currentTime = new Date().getTime();
                    temperatureInput.value = localStorage.getItem('temperature');
                    if (!lastWeatherUpdate || (currentTime - parseInt(lastWeatherUpdate)) >= 300000) { // 300000ms = 5 minutes
                        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${storedPosition.coords.latitude}&longitude=${storedPosition.coords.longitude}&current=temperature_2m`)
                            .then(response => response.json())
                            .then(data => {
                                if (data && data.current && data.current.temperature_2m) {
                                    const temp = Math.round(data.current.temperature_2m);
                                    temperatureInput.value = temp;
                                    localStorage.setItem('lastWeatherUpdate', currentTime.toString());
                                    localStorage.setItem('temperature', temp);
                                }
                            })
                            .catch(error => {
                                console.log('Error fetching weather data:', error);
                            });
                    }
                }

                /* // Only call toggleLayout in automatic mode
                if (isAutomaticMode) {
                    toggleLayout(date);
                } */
            }
            // --- END Time/Date/Weather update function ---

            setInterval(updateRiveTimeAndWeather);
        },
        onLoadError: (error) => {
            console.error('Failed to load Rive animation:', error);
        },
        onPlay: () => {
            console.log('Animation started playing');
        },
        onPause: () => {
            console.log('Animation paused');
        },
        onStop: () => {
            console.log('Animation stopped');
        }
    });

    riveControlsInstance.on(rive.EventType.RiveEvent, (OnRiveEventTriggered));

} catch (error) {
    console.error('Error initializing Rive:', error);
}


// Handle window resize
window.addEventListener('resize', () => {
    if (riveInstance) {
        riveInstance.resizeDrawingSurfaceToCanvas();
    }
});

function OnRiveEventTriggered(event) {
    console.log(event.data.name);
    if (event.data.name === 'Weather') {
        fireTrigger(EnableWeatherEffectsTriggerName);
    }
    if (event.data.name === 'Sky') {
        fireTrigger(EnableSkyTriggerName);
    }
    if (event.data.name === 'W2 Sunny') {
        fireTrigger(SkySunnyTriggerName);
    }
    if (event.data.name === 'W3 Rainy') {
        fireTrigger(SkyRainTriggerName);
    }
    if (event.data.name === 'Layout V') {
        fireTrigger(LayoutVTriggerName);
    }
    if (event.data.name === 'Layout H') {
        fireTrigger(LayoutHTriggerName);
    }
    if (event.data.name === 'D1 Timings') {
        fireTrigger(TrTimeTable);
    }
    if (event.data.name === 'D2 Emergency') {
        fireTrigger(TrEmergency);
    }
    if (event.data.name === 'D3 Transport') {
        fireTrigger(TrTransport);
    }
    if (event.data.name === 'D4 Weather') {
        fireTrigger(TrWeather);
    }
    if (event.data.name === 'D5 Images') {
        fireTrigger(TrImages);
    }  
    
}

function fireTrigger(triggerName) {

    if (inputs) {
        const trigger = inputs.find(i => i.name === triggerName);
        console.log(trigger);
        trigger.fire();
    }
}

function toggleLayout(date) {
    const currentMinute = date.getMinutes();

    if (date.getMinutes() % toggleInterval === 0 && !layoutToggleMap.has(currentMinute)) {
        if (IsDemo || (IsDemo == false && date.getSeconds() === 0)) {

            console.log(isStandardLayout);
            layoutToggleMap.clear();
            layoutToggleMap.set(currentMinute, true);

            if (isStandardLayout || date.getMinutes() % 10 === 0) {
                fireTrigger(LayoutHTriggerName);
                isStandardLayout = true;
            } else {
                console.log('triggering', trScreens[currentTrScreen]);
                fireTrigger(trScreens[currentTrScreen]);
                currentTrScreen = (currentTrScreen + 1) % trScreens.length;
            }
            isStandardLayout = !isStandardLayout;
            lastToggledDate = date;

        }
    }
}

function startAutoToggle(date) {
    if (toggleIntervalId) clearInterval(toggleIntervalId);
    toggleIntervalId = setInterval(() => {
        if (isAutomaticMode) {
            if (speed !== 1) {
                date = spedUpDate;
            } else {
                date = new Date();
            }
            toggleLayout(date);
        }
    }, 1000); // check every second
}

function stopAutoToggle() {
    if (toggleIntervalId) {
        clearInterval(toggleIntervalId);
        toggleIntervalId = null;
    }
}

// Map speed to index and thumb position
const speedOptions = [1, 5, 10];
let currentSpeedIndex = 0;

function updateSpeedSwitch(index) {
    // Set value and call setSpeed
    setSpeed(speedOptions[index]);
    currentSpeedIndex = index;
}

// Initialize
updateSpeedSwitch(0);

function setSpeed(newSpeed) {
    speed = newSpeed;

    if (speed === 1) {
        IsDemo = false;
        timeout = baseTimeout;
        IsSpedUp = false;
    } else {
        IsDemo = true;
        timeout = (baseTimeout * multiplier) / speed;

        if (!spedUpDate || IsSpedUp === false) {
            spedUpDate = new Date();
            IsSpedUp = true;
        }

        if (window.speedUpTimeout) {
            clearTimeout(window.speedUpTimeout);
        }
        setTimeout(speedUpTime);
    }
    console.log('speed', speed);
}

function speedUpTime() {
    spedUpDate.setMinutes(spedUpDate.getMinutes() + 1);
    window.speedUpTimeout = setTimeout(speedUpTime, timeout);
}