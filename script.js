document.addEventListener('DOMContentLoaded', () => {
    const componentItems = document.querySelectorAll('.component-item');
    const editorCanvas = document.getElementById('editor-canvas');
    const propertiesPanel = document.getElementById('properties-panel');
    const propertyFieldsContainer = document.getElementById('property-fields');
    const noElementSelectedMessage = propertiesPanel.querySelector('.no-element-selected');
    const initialCanvasPrompt = editorCanvas.querySelector('.initial-prompt');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    let selectedElement = null;
    let history = [];
    let historyPointer = -1;

    // --- History Management ---
    function saveState() {
        history = history.slice(0, historyPointer + 1);
        history.push(editorCanvas.innerHTML);
        historyPointer++;
        updateUndoRedoButtons();
        console.log("State saved. History length:", history.length, "Pointer:", historyPointer);
    }

    function undo() {
        if (historyPointer > 0) {
            historyPointer--;
            editorCanvas.innerHTML = history[historyPointer];
            reinitializeDroppedElements();
            updateUndoRedoButtons();
            console.log("Undo. History length:", history.length, "Pointer:", historyPointer);
        }
    }

    function redo() {
        if (historyPointer < history.length - 1) {
            historyPointer++;
            editorCanvas.innerHTML = history[historyPointer];
            reinitializeDroppedElements();
            updateUndoRedoButtons();
            console.log("Redo. History length:", history.length, "Pointer:", historyPointer);
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = historyPointer <= 0;
        redoBtn.disabled = historyPointer >= history.length - 1;
    }

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);


    // --- Property Panel Management ---
    function showPropertiesPanel() {
        if (selectedElement) {
            noElementSelectedMessage.style.display = 'none';
            propertyFieldsContainer.innerHTML = '';

            const type = selectedElement.dataset.type;
            console.log("Selected element type:", type);

            // Add general styling properties
            addStylePropertyInput('Background Color', 'background-color', 'color');
            addStylePropertyInput('Text Color', 'color', 'color');
            addStylePropertyInput('Font Size (px)', 'font-size', 'number', 'px');
            addStylePropertyInput('Padding (px)', 'padding', 'number', 'px');
            addStylePropertyInput('Margin Top (px)', 'margin-top', 'number', 'px');
            addStylePropertyInput('Margin Bottom (px)', 'margin-bottom', 'number', 'px');

            // Type-specific properties
            switch (type) {
                case 'text':
                case 'heading':
                    addContentPropertyInput('Content', selectedElement.querySelector('[contenteditable="true"]'));
                    break;
                case 'image':
                    addImageSourceProperty();
                    addStylePropertyInput('Width (px/%/auto)', 'width', 'text');
                    addStylePropertyInput('Height (px/%/auto)', 'height', 'text');
                    break;
                case 'button':
                    addContentPropertyInput('Button Text', selectedElement.querySelector('.btn'));
                    addLinkProperty('Button Link (URL)', selectedElement.querySelector('.btn'));
                    addStylePropertyInput('Button Background', '--button-bg-color', 'color');
                    addStylePropertyInput('Button Text Color', '--button-text-color', 'color');
                    break;
                case 'navbar':
                    addContentPropertyInput('Logo Text', selectedElement.querySelector('.logo'));
                    break;
                case 'footer':
                    addContentPropertyInput('Copyright Text', selectedElement.querySelector('.copyright'));
                    break;
                case 'columns':
                    addSelectProperty('Column Layout', 'grid-template-columns', {
                        '1 Column': '1fr',
                        '2 Columns (50/50)': '1fr 1fr',
                        '3 Columns (33/33/33)': '1fr 1fr 1fr',
                        '2 Columns (30/70)': '0.3fr 0.7fr',
                        '2 Columns (70/30)': '0.7fr 0.3fr'
                    });
                    break;
                case 'icon':
                    addIconPickerProperty();
                    addStylePropertyInput('Icon Size (em)', 'font-size', 'number', 'em');
                    addStylePropertyInput('Icon Color', 'color', 'color');
                    break;
                case 'video':
                    addVideoEmbedProperty();
                    break;
                case 'carousel': // NEW CAROUSEL PROPERTIES
                    addCarouselSlideManagement();
                    addStylePropertyInput('Carousel Height (px)', 'height', 'number', 'px');
                    break;
            }
        } else {
            noElementSelectedMessage.style.display = 'block';
            propertyFieldsContainer.innerHTML = '';
        }
    }

    function addContentPropertyInput(label, targetElement) {
        const div = document.createElement('div');
        div.classList.add('property-group');
        div.innerHTML = `
            <label for="${label.replace(/\s/g, '')}">${label}:</label>
            <textarea id="${label.replace(/\s/g, '')}" rows="4">${targetElement.textContent}</textarea>
        `;
        const input = div.querySelector('textarea');
        input.addEventListener('input', (e) => {
            targetElement.textContent = e.target.value;
            saveState();
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addStylePropertyInput(label, cssProperty, inputType = 'text', unit = '') {
        const div = document.createElement('div');
        div.classList.add('property-group');
        let currentValue;
        if (cssProperty.startsWith('--')) { // For custom CSS variables
            currentValue = selectedElement.style.getPropertyValue(cssProperty);
        } else {
            currentValue = selectedElement.style[cssProperty];
        }

        if (inputType === 'number') {
            currentValue = parseFloat(currentValue) || '';
        } else if (unit && currentValue) {
            currentValue = currentValue.replace(unit, '');
        }

        div.innerHTML = `
            <label for="${cssProperty}">${label}:</label>
            <input type="${inputType}" id="${cssProperty}" value="${currentValue}">
        `;
        const input = div.querySelector('input');
        input.addEventListener('input', (e) => {
            let val = e.target.value;
            if (inputType === 'number' && val !== '') {
                val = parseFloat(val);
                if (isNaN(val)) return;
            }
            if (cssProperty.startsWith('--')) {
                selectedElement.style.setProperty(cssProperty, val + unit);
            } else {
                selectedElement.style[cssProperty] = val + unit;
            }
            saveState();
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addImageSourceProperty() {
        const div = document.createElement('div');
        div.classList.add('property-group');
        const imgElement = selectedElement.querySelector('img');
        div.innerHTML = `
            <label for="imageSrc">Image URL:</label>
            <input type="text" id="imageSrc" value="${imgElement ? imgElement.src : ''}">
            <button class="upload-image-btn"><i class="fas fa-upload"></i> Upload File</button>
            <input type="file" accept="image/*" class="image-upload-input" style="display:none;">
        `;
        const urlInput = div.querySelector('#imageSrc');
        const uploadBtn = div.querySelector('.upload-image-btn');
        const fileInput = div.querySelector('.image-upload-input');

        urlInput.addEventListener('input', (e) => {
            if (imgElement) {
                imgElement.src = e.target.value;
                saveState();
            }
        });

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imgElement) {
                        imgElement.src = e.target.result;
                        saveState();
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addLinkProperty(label, targetElement) {
        const div = document.createElement('div');
        div.classList.add('property-group');
        const currentHref = targetElement.href || targetElement.dataset.link || '';
        div.innerHTML = `
            <label for="${label.replace(/\s/g, '')}">${label}:</label>
            <input type="text" id="${label.replace(/\s/g, '')}" value="${currentHref}">
        `;
        const input = div.querySelector('input');
        input.addEventListener('input', (e) => {
            if (targetElement.tagName === 'A' || targetElement.hasAttribute('href')) {
                targetElement.href = e.target.value;
            } else {
                targetElement.dataset.link = e.target.value;
            }
            saveState();
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addSelectProperty(label, cssProperty, optionsMap) {
        const div = document.createElement('div');
        div.classList.add('property-group');
        let optionsHtml = '';
        for (const [text, value] of Object.entries(optionsMap)) {
            optionsHtml += `<option value="${value}">${text}</option>`;
        }
        div.innerHTML = `
            <label for="${cssProperty}">${label}:</label>
            <select id="${cssProperty}">${optionsHtml}</select>
        `;
        const select = div.querySelector('select');
        select.value = selectedElement.style[cssProperty];
        select.addEventListener('change', (e) => {
            selectedElement.style[cssProperty] = e.target.value;
            saveState();
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addIconPickerProperty() {
        const div = document.createElement('div');
        div.classList.add('property-group');
        const currentIconClass = selectedElement.querySelector('i')?.className.replace('fas fa-', '') || 'star';

        div.innerHTML = `
            <label for="iconClass">Icon Name (Font Awesome):</label>
            <input type="text" id="iconClass" value="${currentIconClass}">
            <p><small>Find icons at <a href="https://fontawesome.com/icons" target="_blank">fontawesome.com/icons</a> (e.g., 'home', 'user', 'heart')</small></p>
        `;
        const input = div.querySelector('input');
        const iconElement = selectedElement.querySelector('i');

        input.addEventListener('input', (e) => {
            const newIcon = e.target.value.trim();
            if (iconElement) {
                iconElement.className = `fas fa-${newIcon}`;
                saveState();
            }
        });
        propertyFieldsContainer.appendChild(div);
    }

    function addVideoEmbedProperty() {
        const div = document.createElement('div');
        div.classList.add('property-group');
        const currentSrc = selectedElement.querySelector('iframe')?.src || '';

        div.innerHTML = `
            <label for="videoUrl">Video URL (YouTube/Vimeo):</label>
            <input type="text" id="videoUrl" value="${currentSrc}">
            <p><small>Paste YouTube/Vimeo embed URL or video ID. Example: https://www.youtube.com/watch?v=VIDEO_ID</small></p>
        `;
        const input = div.querySelector('input');
        const iframeElement = selectedElement.querySelector('iframe');
        const placeholderText = selectedElement.querySelector('.placeholder-text');

        input.addEventListener('input', (e) => {
            let url = e.target.value.trim();
            if (url) {
                if (url.includes('youtube.com/watch?v=')) {
                    url = url.replace('watch?v=', 'embed/');
                } else if (url.includes('vimeo.com/')) {
                    url = url.replace('vimeo.com/', 'player.vimeo.com/video/');
                }
                if (iframeElement) {
                    iframeElement.src = url;
                    iframeElement.style.display = 'block';
                    if (placeholderText) placeholderText.style.display = 'none';
                    saveState();
                }
            } else {
                if (iframeElement) iframeElement.src = '';
                if (placeholderText) placeholderText.style.display = 'block';
                saveState();
            }
        });
        propertyFieldsContainer.appendChild(div);
    }

    // NEW CAROUSEL PROPERTY FUNCTION
    function addCarouselSlideManagement() {
        const div = document.createElement('div');
        div.classList.add('property-group');
        div.innerHTML = `
            <label>Manage Slides:</label>
            <div id="carousel-slides-list"></div>
            <button id="addSlideBtn" class="nav-button" style="margin-top: 10px;"><i class="fas fa-plus"></i> Add New Slide</button>
        `;
        propertyFieldsContainer.appendChild(div);

        const slidesListContainer = div.querySelector('#carousel-slides-list');
        const addSlideBtn = div.querySelector('#addSlideBtn');

        function renderSlidesList() {
            slidesListContainer.innerHTML = ''; // Clear existing list
            const slides = selectedElement.querySelectorAll('.carousel-slide');
            slides.forEach((slide, index) => {
                const slideItem = document.createElement('div');
                slideItem.style.display = 'flex';
                slideItem.style.alignItems = 'center';
                slideItem.style.marginBottom = '5px';
                slideItem.style.border = '1px solid #eee';
                slideItem.style.padding = '5px';
                slideItem.style.borderRadius = '3px';
                slideItem.style.backgroundColor = '#fefefe';

                const slideImage = slide.querySelector('img');
                const thumbnailUrl = slideImage ? slideImage.src : 'https://via.placeholder.com/40x30?text=Slide';

                slideItem.innerHTML = `
                    <img src="${thumbnailUrl}" style="width: 40px; height: 30px; object-fit: cover; margin-right: 10px; border-radius: 3px;">
                    <span>Slide ${index + 1}</span>
                    <button class="delete-slide-btn" data-index="${index}" style="margin-left: auto; background-color: #e74c3c; color: white; border: none; border-radius: 3px; padding: 5px 8px; cursor: pointer;"><i class="fas fa-trash"></i></button>
                `;
                slidesListContainer.appendChild(slideItem);

                // Add event listener for slide selection/editing within the carousel
                slideItem.addEventListener('click', () => {
                    const slideImageElement = slide.querySelector('img');
                    if (slideImageElement) {
                        // Dynamically create a temporary property group for this specific slide's image
                        const tempDiv = document.createElement('div');
                        tempDiv.classList.add('property-group');
                        tempDiv.innerHTML = `
                            <label for="currentSlideImageSrc">Current Slide Image URL:</label>
                            <input type="text" id="currentSlideImageSrc" value="${slideImageElement.src}">
                            <button class="upload-slide-image-btn"><i class="fas fa-upload"></i> Upload Slide Image</button>
                            <input type="file" accept="image/*" class="slide-image-upload-input" style="display:none;">
                            <button class="close-slide-editor-btn" style="margin-top: 10px;">Done Editing Slide</button>
                        `;
                        // Replace existing property fields with the slide-specific one
                        propertyFieldsContainer.innerHTML = '';
                        propertyFieldsContainer.appendChild(tempDiv);
                        noElementSelectedMessage.style.display = 'none';

                        const urlInput = tempDiv.querySelector('#currentSlideImageSrc');
                        const uploadBtn = tempDiv.querySelector('.upload-slide-image-btn');
                        const fileInput = tempDiv.querySelector('.slide-image-upload-input');
                        const closeBtn = tempDiv.querySelector('.close-slide-editor-btn');

                        urlInput.addEventListener('input', (e) => {
                            slideImageElement.src = e.target.value;
                            renderSlidesList(); // Re-render thumbnail
                            saveState();
                        });

                        uploadBtn.addEventListener('click', () => fileInput.click());
                        fileInput.addEventListener('change', (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    slideImageElement.src = e.target.result;
                                    renderSlidesList(); // Re-render thumbnail
                                    saveState();
                                };
                                reader.readAsDataURL(file);
                            }
                        });

                        closeBtn.addEventListener('click', () => {
                            showPropertiesPanel(); // Go back to main carousel properties
                        });

                        // Add a class to the carousel slide overlay to keep it visible while editing its image
                        slide.querySelector('.slide-overlay').classList.add('editing-active');
                    }
                });
            });

            // Add event listeners for delete buttons
            slidesListContainer.querySelectorAll('.delete-slide-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent slide selection
                    const indexToDelete = parseInt(e.target.dataset.index);
                    const slides = selectedElement.querySelectorAll('.carousel-slide');
                    if (slides.length > 1) { // Ensure at least one slide remains
                        slides[indexToDelete].remove();
                        // Reset current slide index if necessary (e.g., if current slide was deleted)
                        const currentSlideIndex = parseInt(selectedElement.dataset.currentSlideIndex || '0');
                        if (indexToDelete <= currentSlideIndex) {
                            selectedElement.dataset.currentSlideIndex = Math.max(0, currentSlideIndex - 1);
                        }
                        updateCarouselDisplay(selectedElement);
                        renderSlidesList();
                        saveState();
                    } else {
                        alert("Carousel must have at least one slide.");
                    }
                });
            });
        }

        addSlideBtn.addEventListener('click', () => {
            const newSlide = document.createElement('div');
            newSlide.classList.add('carousel-slide');
            newSlide.innerHTML = `
                <img src="https://via.placeholder.com/400x300?text=New+Slide" alt="New Slide">
                <div class="slide-overlay"><i class="fas fa-camera"></i> Click to change image</div>
            `;
            selectedElement.querySelector('.carousel-slides-container').appendChild(newSlide);
            updateCarouselDisplay(selectedElement); // Ensure carousel updates
            renderSlidesList(); // Re-render the property panel list
            makeElementInteractive(selectedElement); // Re-attach listeners to carousel itself
            saveState();
        });

        renderSlidesList(); // Initial render of slides when carousel is selected
    }

    // Carousel internal logic for sliding
    function updateCarouselDisplay(carouselElement) {
        const slidesContainer = carouselElement.querySelector('.carousel-slides-container');
        if (!slidesContainer) return;

        const slides = carouselElement.querySelectorAll('.carousel-slide');
        if (slides.length === 0) {
            slidesContainer.style.transform = `translateX(0)`; // Reset if no slides
            return;
        }

        let currentSlideIndex = parseInt(carouselElement.dataset.currentSlideIndex || '0');
        if (currentSlideIndex >= slides.length) {
            currentSlideIndex = slides.length - 1;
        }
        if (currentSlideIndex < 0) {
            currentSlideIndex = 0;
        }
        carouselElement.dataset.currentSlideIndex = currentSlideIndex;

        const offset = -currentSlideIndex * 100;
        slidesContainer.style.transform = `translateX(${offset}%)`;

        // Hide overlays for non-selected elements
        carouselElement.querySelectorAll('.carousel-slide .slide-overlay').forEach(overlay => {
            if (!overlay.classList.contains('editing-active')) { // Don't hide if actively editing
                overlay.style.opacity = '0';
            }
        });
    }

    function moveCarousel(carouselElement, direction) {
        const slides = carouselElement.querySelectorAll('.carousel-slide');
        if (slides.length <= 1) return;

        let currentSlideIndex = parseInt(carouselElement.dataset.currentSlideIndex || '0');
        currentSlideIndex += direction;

        if (currentSlideIndex >= slides.length) {
            currentSlideIndex = 0; // Loop to start
        } else if (currentSlideIndex < 0) {
            currentSlideIndex = slides.length - 1; // Loop to end
        }

        carouselElement.dataset.currentSlideIndex = currentSlideIndex;
        updateCarouselDisplay(carouselElement);
        // No saveState here, as moving is a preview action, not content modification
    }


    // Function to make a dropped element interactive (draggable, selectable, editable)
    function makeElementInteractive(element) {
        element.draggable = true;
        element.classList.add('movable-element');

        const editableContent = element.querySelectorAll('[contenteditable="true"]');
        editableContent.forEach(item => {
            item.addEventListener('mousedown', (e) => e.stopPropagation());
            item.addEventListener('input', () => saveState());
        });

        // Specific click handling for carousel slide overlays
        if (element.classList.contains('carousel-slide')) {
            const overlay = element.querySelector('.slide-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent selecting parent carousel block
                    if (selectedElement && selectedElement.classList.contains('carousel-block')) {
                        // Temporarily set the selected element to the slide itself for property editing
                        selectedElement.classList.remove('selected');
                        selectedElement = element; // Select the individual slide
                        selectedElement.classList.add('selected');
                        showPropertiesPanel(); // This will trigger addImageSourceProperty for the slide's image
                    }
                });
            }
        } else if (element.classList.contains('carousel-block')) {
            // Add click listeners to carousel navigation buttons
            const prevBtn = element.querySelector('.carousel-control-btn.prev');
            const nextBtn = element.querySelector('.carousel-control-btn.next');

            if (prevBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent selecting carousel block
                    moveCarousel(element, -1);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent selecting carousel block
                    moveCarousel(element, 1);
                });
            }
        }


        // Click to select/deselect element on canvas
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedElement && selectedElement !== element) {
                selectedElement.classList.remove('selected');
                // If previously selected element was a carousel slide, remove its editing-active class
                if (selectedElement.classList.contains('carousel-slide')) {
                    const prevOverlay = selectedElement.querySelector('.slide-overlay');
                    if (prevOverlay) prevOverlay.classList.remove('editing-active');
                }
            }
            selectedElement = element;
            selectedElement.classList.add('selected');
            showPropertiesPanel();
        });

        // Drag start for reordering (No change)
        element.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('movable-element')) {
                e.dataTransfer.setData('text/html', element.outerHTML);
                e.dataTransfer.setData('text/plain', 'reorder');
                e.target.classList.add('dragging-reorder');
                setTimeout(() => { e.target.style.display = 'none'; }, 0);
            }
        });
        // Drag end for reordering (No change)
        element.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging-reorder');
            if (e.target.parentNode) { e.target.style.display = 'block'; }
        });
    }

    // Function to re-attach listeners after innerHTML changes
    function reinitializeDroppedElements() {
        selectedElement = null;
        showPropertiesPanel();

        document.querySelectorAll('.movable-element').forEach(el => {
            makeElementInteractive(el);
            // If it's a carousel, ensure its display is updated
            if (el.classList.contains('carousel-block')) {
                updateCarouselDisplay(el);
            }
        });

        document.querySelectorAll('.image-block').forEach(imgBlock => {
            const imgElement = imgBlock.querySelector('img');
            const fileInput = imgBlock.querySelector('.image-upload-input');
            if (imgElement && fileInput) {
                imgElement.replaceWith(imgElement.cloneNode(true));
                const newImgElement = imgBlock.querySelector('img');
                const newFileInput = imgBlock.querySelector('.image-upload-input');

                newImgElement.addEventListener('click', () => newFileInput.click());
                newFileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => newImgElement.src = e.target.result;
                        reader.readAsDataURL(file);
                        saveState();
                    }
                });
            }
        });

        // Re-attach drag/drop listeners for section blocks and column blocks
        document.querySelectorAll('.section-block, .columns-block .column').forEach(container => {
            // Remove all existing listeners to prevent duplicates
            const oldContainer = container.cloneNode(true);
            container.parentNode.replaceChild(oldContainer, container);
            const newContainer = oldContainer; // Use new reference

            newContainer.removeEventListener('dragover', handleDragOver);
            newContainer.addEventListener('dragover', handleDragOver);
            newContainer.removeEventListener('dragleave', handleDragLeave);
            newContainer.addEventListener('dragleave', handleDragLeave);
            newContainer.removeEventListener('drop', handleDrop);
            newContainer.addEventListener('drop', handleDrop);
        });

        if (editorCanvas.querySelectorAll('.dropped-element').length > 0) {
            initialCanvasPrompt.style.display = 'none';
        } else {
            initialCanvasPrompt.style.display = 'block';
        }
    }


    // --- Drag Start Event Listener (for components from sidebar) (No Change) ---
    componentItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.type);
            e.target.classList.add('dragging');
        });
        item.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    });

    // --- Drag Over Event Listener (on the canvas and nested containers) (No Change) ---
    editorCanvas.addEventListener('dragover', handleDragOver);

    function handleDragOver(e) {
        e.preventDefault();
        const targetElement = e.target.closest('.editor-canvas, .section-block, .columns-block .column');

        document.querySelectorAll('.editor-canvas, .section-block, .columns-block .column').forEach(el => el.classList.remove('drag-over'));

        if (targetElement) {
            targetElement.classList.add('drag-over');

            const draggingElement = document.querySelector('.dragging-reorder');
            if (draggingElement) {
                const afterElement = getDragAfterElement(targetElement, e.clientY);
                const dropIndicator = document.getElementById('drop-indicator') || createDropIndicator();

                if (afterElement == null) {
                    targetElement.appendChild(dropIndicator);
                } else {
                    targetElement.insertBefore(dropIndicator, afterElement);
                }
            }
        }
    }

    function getDragAfterElement(container, y) {
        const movableElements = [...container.querySelectorAll(':scope > .movable-element:not(.dragging-reorder)')];

        return movableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function createDropIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'drop-indicator';
        indicator.style.height = '4px';
        indicator.style.backgroundColor = '#3498db';
        indicator.style.margin = '5px 0';
        indicator.style.borderRadius = '2px';
        indicator.style.width = '100%';
        return indicator;
    }

    // --- Drag Leave Event Listener (on the canvas and nested containers) ---
    editorCanvas.addEventListener('dragleave', handleDragLeave);
    document.querySelectorAll('.columns-block .column').forEach(col => {
        col.addEventListener('dragleave', handleDragLeave);
    });

    function handleDragLeave(e) {
        const relatedTarget = e.relatedTarget;
        if (!relatedTarget || (!relatedTarget.closest('.editor-canvas') && !relatedTarget.closest('.section-block') && !relatedTarget.closest('.columns-block .column'))) {
            document.querySelectorAll('.editor-canvas, .section-block, .columns-block .column').forEach(el => el.classList.remove('drag-over'));
            const dropIndicator = document.getElementById('drop-indicator');
            if (dropIndicator) dropIndicator.remove();
        }
    }


    // --- Drop Event Listener (on the canvas and nested containers) ---
    editorCanvas.addEventListener('drop', handleDrop);

    function handleDrop(e) {
        e.preventDefault();
        document.querySelectorAll('.editor-canvas, .section-block, .columns-block .column').forEach(el => el.classList.remove('drag-over'));
        const dropIndicator = document.getElementById('drop-indicator');
        if (dropIndicator) dropIndicator.remove();

        const componentType = e.dataTransfer.getData('text/plain');
        const reorderHtml = e.dataTransfer.getData('text/html');

        const dropTarget = e.target.closest('.editor-canvas, .section-block, .columns-block .column');
        if (!dropTarget) return;

        let newElement;

        if (componentType && componentType !== 'reorder') {
            newElement = document.createElement('div');
            newElement.classList.add('dropped-element');
            newElement.dataset.type = componentType;

            switch (componentType) {
                case 'text':
                    newElement.classList.add('text-block');
                    newElement.innerHTML = `<p contenteditable="true">Click to edit this text block.</p>`;
                    break;
                case 'image':
                    newElement.classList.add('image-block');
                    newElement.innerHTML = `<img src="https://via.placeholder.com/200x150?text=Click+to+Change+Image" alt="Placeholder Image">
                                            <input type="file" accept="image/*" class="image-upload-input" style="display:none;">`;
                    break;
                case 'button':
                    newElement.classList.add('button-block');
                    newElement.style.setProperty('--button-bg-color', '#3498db');
                    newElement.style.setProperty('--button-text-color', 'white');
                    newElement.innerHTML = `<button class="btn" contenteditable="true" href="#">Click Me</button>`;
                    break;
                case 'navbar':
                    newElement.classList.add('navbar-block');
                    newElement.innerHTML = `
                        <div class="logo" contenteditable="true">Tech Command</div>
                        <ul class="nav-links">
                            <li><a href="#" contenteditable="true">Home</a></li>
                            <li><a href="#" contenteditable="true">About</a></li>
                            <li><a href="#" contenteditable="true">Services</a></li>
                            <li><a href="#" contenteditable="true">Contact</a></li>
                        </ul>
                    `;
                    break;
                case 'footer':
                    newElement.classList.add('footer-block');
                    newElement.innerHTML = `
                        <p class="copyright" contenteditable="true">© 2025 Tech Command. All rights reserved.</p>
                        <div class="social-links">
                            <a href="#" contenteditable="true"><i class="fab fa-facebook-f"></i> Facebook</a>
                            <a href="#" contenteditable="true"><i class="fab fa-twitter"></i> Twitter</a>
                            <a href="#" contenteditable="true"><i class="fab fa-linkedin-in"></i> LinkedIn</a>
                        </div>
                    `;
                    break;
                case 'section':
                    newElement.classList.add('section-block');
                    newElement.innerHTML = `
                        <p contenteditable="true" style="text-align: center; color: #777; font-style: italic;">This is a flexible container. Drop elements inside!</p>
                    `;
                    break;
                case 'heading':
                    newElement.classList.add('heading-block');
                    newElement.innerHTML = `<h1 contenteditable="true">Your Awesome Heading</h1>`;
                    break;
                case 'columns':
                    newElement.classList.add('columns-block');
                    newElement.innerHTML = `
                        <div class="column" data-column-index="0"></div>
                        <div class="column" data-column-index="1"></div>
                    `;
                    newElement.style.display = 'flex';
                    newElement.style.gap = '15px';
                    newElement.style.gridTemplateColumns = '1fr 1fr';
                    break;
                case 'icon':
                    newElement.classList.add('icon-block');
                    newElement.innerHTML = `<i class="fas fa-star" contenteditable="false"></i>`;
                    break;
                case 'video':
                    newElement.classList.add('video-block');
                    newElement.innerHTML = `
                        <iframe src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="display:none;"></iframe>
                        <p class="placeholder-text">Click to add video URL</p>
                    `;
                    break;
                case 'carousel': // NEW CAROUSEL LOGIC
                    newElement.classList.add('carousel-block');
                    newElement.dataset.currentSlideIndex = '0'; // Track current slide
                    newElement.innerHTML = `
                        <div class="carousel-slides-container">
                            <div class="carousel-slide">
                                <img src="https://via.placeholder.com/400x300?text=Slide+1" alt="Slide 1">
                                <div class="slide-overlay"><i class="fas fa-camera"></i> Click to change image</div>
                            </div>
                            <div class="carousel-slide">
                                <img src="https://via.placeholder.com/400x300?text=Slide+2" alt="Slide 2">
                                <div class="slide-overlay"><i class="fas fa-camera"></i> Click to change image</div>
                            </div>
                        </div>
                        <button class="carousel-control-btn prev"><i class="fas fa-chevron-left"></i></button>
                        <button class="carousel-control-btn next"><i class="fas fa-chevron-right"></i></button>
                    `;
                    break;
            }
            makeElementInteractive(newElement);

        } else if (reorderHtml && componentType === 'reorder') {
            const draggedElement = document.querySelector('.dragging-reorder');
            if (draggedElement) { draggedElement.remove(); }
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reorderHtml;
            newElement = tempDiv.firstElementChild;
            newElement.style.display = 'block';
        }

        if (newElement) {
            if (initialCanvasPrompt && editorCanvas.querySelectorAll('.dropped-element').length === 0 && componentType !== 'reorder') {
                initialCanvasPrompt.style.display = 'none';
            }

            const afterElement = getDragAfterElement(dropTarget, e.clientY);
            if (afterElement == null) {
                dropTarget.appendChild(newElement);
            } else {
                dropTarget.insertBefore(newElement, afterElement);
            }

            reinitializeDroppedElements();
            saveState();
        }
    }

    // Deselect elements when clicking on the canvas or property panel background
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropped-element') && e.target !== editorCanvas && !e.target.closest('.properties-panel')) {
            if (selectedElement) {
                // If it was a carousel slide being edited, remove its editing-active class
                if (selectedElement.classList.contains('carousel-slide')) {
                    const parentCarousel = selectedElement.closest('.carousel-block');
                    if (parentCarousel) {
                        selectedElement = parentCarousel; // Re-select parent carousel
                        updateCarouselDisplay(selectedElement); // Ensure overlay is hidden
                    }
                }
                selectedElement.classList.remove('selected');
                selectedElement = null;
                showPropertiesPanel();
            }
        }
    });

    // Initial state save when the page loads
    saveState();
});
