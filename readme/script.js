// Function to load images, labels, and texts from JSON

function createArray(num) {
    return Array.from({ length: num }, (_, i) => i + 1);
}

function updateNav() {
    const currentPage = 'readme.html'; // Set this to the current page name
    const availablePages = createArray(4); // List of available page numbers

    document.getElementById('nav').innerHTML = navHtml;
}

window.onload = updateNav;

function loadData(modeCount, jsonData, callback) {
    const images = [];
    const labels = [];
    const texts = [];

    for (let modeIndex = 1; modeIndex <= modeCount; modeIndex++) {
        const modeImages = jsonData[`mode_${modeIndex}`].pwms;
        const modeLabels = jsonData[`mode_${modeIndex}`].labels;
        const modeTexts = jsonData[`mode_${modeIndex}`].texts;

        images.push(modeImages);
        labels.push(modeLabels);
        texts.push(modeTexts);
    }

    callback(images, labels, texts);
}

// Initialize the sliders with the loaded data
function initializeSliders(images, labels, texts) {
    images.forEach((modeImages, index) => {
        const modeLabels = labels[index];
        const modeTexts = texts[index];
        const sliderId = `valR${index + 1}`;
        const imgElementId = `img${index + 1}`;
        const rangeElementId = `range${index + 1}`;
        const textElementId1 = `text${index + 1}_1`;
        const textElementId2 = `text${index + 1}_2`;
        const textElementId3 = `text${index + 1}_3`;
        const textElementId4 = `text${index + 1}_4`;

        function showVal(newVal) {
            const imgElement = document.getElementById(imgElementId);
            imgElement.style.opacity = 0;  // Start fading out

            setTimeout(function() {
                document.getElementById(rangeElementId).innerHTML = modeLabels[newVal];
                document.getElementById(textElementId1).innerHTML = `<span class="putBar">contribution</span>`;
                document.getElementById(textElementId2).innerHTML = modeTexts[newVal][1];
                document.getElementById(textElementId3).innerHTML = modeTexts[newVal][2];
                document.getElementById(textElementId4).innerHTML = modeTexts[newVal][3];
                imgElement.src = modeImages[newVal];
                imgElement.style.opacity = 1;  // Fade back in
            }, 250);  // Wait for half the transition duration (0.5s / 2)
        }

        // Set initial values for each slider
        document.getElementById(rangeElementId).innerHTML = modeLabels[0];
        document.getElementById(textElementId1).innerHTML = `<span class="putBar">contribution</span>`;
        document.getElementById(textElementId2).innerHTML = modeTexts[0][1];
        document.getElementById(textElementId3).innerHTML = modeTexts[0][2];
        document.getElementById(textElementId4).innerHTML = modeTexts[0][3];
        document.getElementById(imgElementId).src = modeImages[0];

        // Attach event listener to each slider
        document.getElementById(sliderId).addEventListener('input', function() {
            showVal(this.value);
        });
    });
}

// Variable to store the loaded JSON data
let jsonData = {};

// Function to load JSON data and store it in the jsonData variable
function loadJSONData(callback) {
    fetch('data2.json')
        .then(response => response.json())
        .then(data => {
            jsonData = data;
            console.log('JSON data loaded:', jsonData);
            if (callback) callback();
        })
        .catch(error => {
            console.error('Error loading JSON data:', error);
        });
}

// Call the function to load the JSON data
loadJSONData(() => {
    // Ensure jsonData is loaded and then call loadData
    loadData(16, jsonData, initializeSliders);
});

// -------------------- sequence hightlighting part  --------------------

let scrollPosition = 0;
   
function openHtmlWindow(imageFile, textContent) {
    // Store the current scroll position
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Set the image source in the modal
    document.getElementById('modalImage').src = imageFile;

    // Set the dynamic text content
    document.getElementById('modalText').innerHTML = textContent;

    // Display the modal
    document.getElementById('highlightModal_cluster').style.display = "block";
}

function closeModal_cluster() {
    // Hide the modal
    document.getElementById('highlightModal_cluster').style.display = "none";

    // Restore scroll position
    window.scrollTo(0, scrollPosition);
}

function loadFile(filePath) {
    return fetch(filePath).then(response => response.text());
}

function openHighlightPage(csvFile) {
    // Store the current scroll position
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    const fastaFiles = [
        'MA0137.3.sites'
    ];

    // Load all FASTA files and the CSV file
    const fastaPromises = fastaFiles.map(file => loadFile(file));
    Promise.all([...fastaPromises, loadFile(csvFile)])
        .then(contents => {
            const fastaContents = contents.slice(0, fastaFiles.length);
            const csvContent = contents[contents.length - 1];

            // Combine sequences from all FASTA files
            const sequences = fastaContents.flatMap(fastaContent => parseFasta(fastaContent));
            const highlights = parseCsv(csvContent);

            const htmlContent = generateHtml(sequences, highlights);

            // Insert the generated HTML into the modal
            document.getElementById('highlightedSequences').innerHTML = htmlContent;

            // Show the modal
            document.getElementById('highlightModal').style.display = "block";
        });
}

function closeModal() {
    document.getElementById('highlightModal').style.display = "none";

    // Restore the scroll position
    window.scrollTo(0, scrollPosition);
}

// Close the modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('highlightModal');
    if (event.target === modal) {
        closeModal();
    }
    const modal_cluster = document.getElementById('highlightModal_cluster');
    if (event.target === modal_cluster) {
        closeModal_cluster();
    }
}

// Close the modal when pressing the "Esc" key
window.onkeydown = function(event) {
    if (event.key === "Escape") {
        closeModal();
        closeModal_cluster();
    }
}

function parseFasta(fastaContent) {
    const lines = fastaContent.split('\n');
    const sequences = [];
    let currentHeader = '';
    let currentSequence = '';
    lines.forEach(line => {
        if (line.startsWith('>')) {
            if (currentHeader) {
                sequences.push({ header: currentHeader, sequence: currentSequence });
                currentSequence = '';
            }
            currentHeader = line;
        } else {
            currentSequence += line.trim();
        }
    });
    if (currentHeader) {
        sequences.push({ header: currentHeader, sequence: currentSequence });
    }
    return sequences;
}

function parseCsv(csvContent) {
    const lines = csvContent.trim().split('\n');
    const highlights = [];
    lines.slice(1).forEach(line => {
        const [seqIndex, startPosition, endPosition] = line.split(',').map(Number);
        if (!isNaN(seqIndex) && !isNaN(startPosition) && !isNaN(endPosition)) {
            highlights.push({ seqIndex, startPosition, endPosition });
        }
    });
    return highlights;
}

function generateHtml(sequences, highlights) {
    const uniqueIndices = [...new Set(highlights.map(h => h.seqIndex))];
    let htmlContent = '';

    uniqueIndices.forEach(index => {
        const sequence = sequences[index];
        const highlightsForSequence = highlights.filter(h => h.seqIndex === index);
        const highlightedSequence = highlightSequence(sequence.sequence, highlightsForSequence);

        htmlContent += `
            <div class="header">${sequence.header}</div>
            <div class="sequence">${highlightedSequence}</div>
        `;
    });

    return htmlContent;
}

function highlightSequence(sequence, highlights) {
    // Sort the highlights by startPosition
    highlights.sort((a, b) => a.startPosition - b.startPosition);

    // Merge overlapping intervals
    const mergedHighlights = [];
    highlights.forEach(({ startPosition, endPosition }) => {
        if (mergedHighlights.length === 0 || mergedHighlights[mergedHighlights.length - 1].endPosition < startPosition) {
            mergedHighlights.push({ startPosition, endPosition });
        } else {
            mergedHighlights[mergedHighlights.length - 1].endPosition = Math.max(
                mergedHighlights[mergedHighlights.length - 1].endPosition,
                endPosition
            );
        }
    });

    // Apply the highlights to the sequence
    let highlighted = '';
    let lastIndex = 0;

    mergedHighlights.forEach(({ startPosition, endPosition }) => {
        if (startPosition > lastIndex) {
            highlighted += sequence.substring(lastIndex, startPosition);
        }
        highlighted += `<span class="highlight">${sequence.substring(startPosition, endPosition)}</span>`;
        lastIndex = endPosition;
    });

    if (lastIndex < sequence.length) {
        highlighted += sequence.substring(lastIndex);
    }

    return highlighted;
}

// hover window

    const hoverWindow = document.getElementById('hoverWindow');

    document.addEventListener('scroll', () => {
        const scrollY = window.scrollY || window.pageYOffset;
    });

