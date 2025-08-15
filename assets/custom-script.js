// Custom JavaScript


// Star rating 
function initStars(id, rating) {
    const container = document.getElementById(id);
    if (!container) return;
    
    const stars = Array.from({length: 5}, (_, i) => {
        const star = document.createElement('div');
        star.className = 'star';
        star.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" class="star-path" stroke="#FFD700" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
        return star;
    });
    
    container.replaceChildren(...stars);
    
    stars.forEach((star, i) => {
        const path = star.querySelector('.star-path');
        const starNum = i + 1;
        const full = starNum <= Math.floor(rating);
        const hasPartial = rating % 1 > 0;
        const isPartialStar = starNum === Math.floor(rating) + 1 && hasPartial;
        
        if (full) {
            // Full star
            path.style.cssText = 'fill:#FFD700;stroke:#FFD700';
        } else if (isPartialStar) {
            // Partial star
            const pct = (rating % 1) * 100;
            const gradientId = `gradient-${id}-${i}`;
            const svg = star.querySelector('svg');
            
            // Add gradient definition
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            gradient.id = gradientId;
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', `${pct}%`);
            stop1.setAttribute('stop-color', '#FFD700');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', `${pct}%`);
            stop2.setAttribute('stop-color', 'transparent');
            
            gradient.appendChild(stop1);
            gradient.appendChild(stop2);
            defs.appendChild(gradient);
            svg.appendChild(defs);
            
            path.style.cssText = `fill:url(#${gradientId});stroke:#FFD700`;
        } else {
            // Empty star
            path.style.cssText = 'fill:transparent;stroke:#666';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all star ratings on the page
    const starElements = document.querySelectorAll('[id^="starRating"]');
    starElements.forEach(el => {
        const rating = parseFloat(el.dataset.rating) || 0;
        if (rating > 0) {
            initStars(el.id, rating);
        }
    });
    
    // Also handle dynamically loaded content (for AJAX cart updates, etc.)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    const newStarElements = node.querySelectorAll ? node.querySelectorAll('[id^="starRating"]') : [];
                    newStarElements.forEach(el => {
                        const rating = parseFloat(el.dataset.rating) || 0;
                        if (rating > 0 && !el.querySelector('.star')) {
                            initStars(el.id, rating);
                        }
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});