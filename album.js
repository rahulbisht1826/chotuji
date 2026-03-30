document.addEventListener("DOMContentLoaded", () => {
    const book = document.getElementById("book");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    // Generation of album pages based on exactly 43 images uploaded
    const totalImages = 43;
    const totalPages = Math.ceil((totalImages + 2) / 2);
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        const zIndex = totalPages - i + 1;
        html += `<div class="page" id="p${i}" style="z-index: ${zIndex}">`;
        
        // Render Front Side
        if (i === 1) {
            html += `
                <div class="front cover">
                    <div class="cover-content">
                        <h1>Happy Birthday</h1>
                        <p>A beautiful journey</p>
                    </div>
                </div>`;
        } else {
            const imgIndex = (i - 1) * 2;
            if (imgIndex <= totalImages) {
                html += `
                    <div class="front">
                        <img src="./src/album_images/${imgIndex}.jpg" class="photo" alt="Photo ${imgIndex}">
                    </div>`;
            } else {
                html += `<div class="front"></div>`; // Inside blank filler page
            }
        }

        // Render Back Side
        if (i === totalPages) {
            html += `
                <div class="back cover back-cover">
                    <div class="cover-content">
                        <h1>Forever Memories</h1>
                        <p>Forever etched in memories</p>
                    </div>
                </div>`;
        } else {
            const imgIndex = (i - 1) * 2 + 1;
            if (imgIndex <= totalImages) {
                html += `
                    <div class="back">
                        <img src="./src/album_images/${imgIndex}.jpg" class="photo" alt="Photo ${imgIndex}">
                    </div>`;
            } else {
                html += `<div class="back"></div>`; // Inside blank filler page
            }
        }
        
        html += `</div>`;
    }
    
    book.innerHTML = html;

    // Flipping logic
    let currentLocation = 1;
    let numOfPapers = totalPages;
    let maxLocation = numOfPapers + 1; // 10

    function openBook() {
        book.style.transform = "translateX(50%)"; 
    }

    function closeBook(isAtBeginning) {
        if (isAtBeginning) {
            book.style.transform = "translateX(0%)";
        } else {
            book.style.transform = "translateX(100%)";
        }
    }

    function goNextPage() {
        if (currentLocation < maxLocation) {
            if (currentLocation === 1) openBook();
            
            let paper = document.querySelector("#p" + currentLocation);
            paper.classList.add("flipped");
            
            // To ensure 3d overlapping depth works flawlessly without clipping,
            // we lift it entirely during the rotate.
            paper.style.zIndex = 50 + currentLocation; 
            
            let finalZ = currentLocation; // Drop to current rank on left stack
            setTimeout(() => {
                paper.style.zIndex = finalZ;
            }, 500); // Wait half transition duration
            
            currentLocation++;
            
            if (currentLocation === maxLocation) closeBook(false);
        }
    }

    function goPrevPage() {
        if (currentLocation > 1) {
            currentLocation--;
            
            let paper = document.querySelector("#p" + currentLocation);
            paper.classList.remove("flipped");
            
            paper.style.zIndex = 50 + currentLocation;
            
            let finalZ = numOfPapers - currentLocation + 1;
            setTimeout(() => {
                paper.style.zIndex = finalZ;
            }, 500);
            
            if (currentLocation === 1) closeBook(true);
            if (currentLocation === maxLocation - 1) openBook();
        }
    }

    // Attach click events to the whole page as a backup and the buttons
    prevBtn.addEventListener("click", goPrevPage);
    nextBtn.addEventListener("click", goNextPage);

    // Let user tap right/left side of the book to flip page naturally
    const papers = document.querySelectorAll(".page");
    papers.forEach((p, index) => {
        const i = index + 1;
        p.addEventListener("click", (e) => {
            // If we click on the right side block and it corresponds to the current page on top
            if (currentLocation === i) {
                goNextPage();
            } else if (currentLocation === i + 1) {
                goPrevPage();
            }
        });
    });
});
