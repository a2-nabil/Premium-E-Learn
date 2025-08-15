/**
 * SRS Course Filter - AJAX functionality for filtering course products
 */
class SRSCourseFilter {
  constructor(container) {
    this.container = container;
    this.sectionId = container.dataset.sectionId;
    this.defaultCollection = container.dataset.defaultCollection;
    this.currentCollection = container.dataset.currentCollection;
    this.productLimit = parseInt(container.dataset.productLimit) || 12;
    this.currentPage = 1;
    this.isLoading = false;
    
    this.productsContainer = container.querySelector('[data-products-container]');
    this.categoryButton = container.querySelector('.srs-category-button');
    this.dropdownContent = container.querySelector('.srs-dropdown-content');
    this.resetButton = container.querySelector('.srs-reset-button');
    this.loadMoreButton = container.querySelector('[data-load-more]');
    this.currentCountElement = container.querySelector('.srs-current-count');
    this.totalCountElement = container.querySelector('.srs-total-count');
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updateCounts();
  }
  
  bindEvents() {
    // Collection filter dropdown
    if (this.dropdownContent) {
      this.dropdownContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('srs-collection-option')) {
          e.preventDefault();
          const collectionHandle = e.target.dataset.collectionHandle;
          this.filterByCollection(collectionHandle);
        }
      });
    }
    
    // Reset button
    if (this.resetButton) {
      this.resetButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetToDefault();
      });
    }
    
    // Load more button
    if (this.loadMoreButton) {
      this.loadMoreButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.loadMore();
      });
    }
    
    // Dropdown toggle
    if (this.categoryButton) {
      this.categoryButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }
  
  toggleDropdown() {
    this.dropdownContent.classList.toggle('show');
  }
  
  closeDropdown() {
    this.dropdownContent.classList.remove('show');
  }
  
  async filterByCollection(collectionHandle) {
    if (this.isLoading || collectionHandle === this.currentCollection) return;
    
    this.isLoading = true;
    this.currentPage = 1;
    this.currentCollection = collectionHandle;
    
    // Update UI
    this.updateButtonText(collectionHandle);
    this.updateActiveOption(collectionHandle);
    this.showLoadingState();
    
    try {
      const products = await this.fetchProducts(collectionHandle, 1);
      this.updateProductsGrid(products);
      this.updateCounts();
      this.resetLoadMore();
    } catch (error) {
      console.error('Error filtering products:', error);
      this.showError('Failed to load products. Please try again.');
    } finally {
      this.hideLoadingState();
      this.isLoading = false;
    }
  }
  
  async loadMore() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.currentPage++;
    
    // Show loading state on load more button
    if (this.loadMoreButton) {
      this.loadMoreButton.disabled = true;
      this.loadMoreButton.textContent = 'Loading...';
    }
    
    try {
      const products = await this.fetchProducts(this.currentCollection, this.currentPage);
      this.appendProducts(products);
      this.updateLoadMoreButton();
    } catch (error) {
      console.error('Error loading more products:', error);
      this.currentPage--; // Revert page number on error
      this.showError('Failed to load more products. Please try again.');
    } finally {
      this.isLoading = false;
      if (this.loadMoreButton) {
        this.loadMoreButton.disabled = false;
        this.loadMoreButton.textContent = 'Load More Courses';
      }
    }
  }
  
  async resetToDefault() {
    await this.filterByCollection(this.defaultCollection);
  }
  
  async fetchProducts(collectionHandle, page = 1) {
    // Get the current page URL and add section parameters
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('collection', collectionHandle);
    currentUrl.searchParams.set('limit', this.productLimit);
    currentUrl.searchParams.set('page', page);
    currentUrl.searchParams.set('section_id', this.sectionId);
    currentUrl.searchParams.set('ajax', 'true');
    
    const response = await fetch(currentUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract products HTML from the current section
    const sectionElement = doc.querySelector(`[data-section-id="${this.sectionId}"]`);
    if (!sectionElement) {
      throw new Error('Section not found in response');
    }
    
    const productItems = Array.from(sectionElement.querySelectorAll('.srs-product-item, .srs-no-products'));
    
    // Calculate pagination info
    const totalProducts = parseInt(collectionHandle === 'all' ? 
      doc.querySelector('.srs-total-count')?.textContent || '0' : 
      doc.querySelector(`[data-collection-handle="${collectionHandle}"] .srs-collection-count`)?.textContent.replace(/[()]/g, '') || '0');
    
    const paginationInfo = {
      current_page: page,
      total_pages: Math.ceil(totalProducts / this.productLimit),
      total_products: totalProducts,
      has_more: productItems.length === this.productLimit
    };
    
    return {
      products: productItems,
      pagination: paginationInfo
    };
  }
  
  updateProductsGrid(data) {
    if (!this.productsContainer) return;
    
    // Clear existing products
    this.productsContainer.innerHTML = '';
    
    // Add new products
    if (data.products.length > 0) {
      data.products.forEach(productElement => {
        this.productsContainer.appendChild(productElement.cloneNode(true));
      });
    }
    
    // Store pagination info
    this.paginationInfo = data.pagination;
  }
  
  appendProducts(data) {
    if (!this.productsContainer) return;
    
    // Remove any "no products" message
    const noProductsElement = this.productsContainer.querySelector('.srs-no-products');
    if (noProductsElement) {
      noProductsElement.remove();
    }
    
    // Add new products
    if (data.products.length > 0) {
      data.products.forEach(productElement => {
        this.productsContainer.appendChild(productElement.cloneNode(true));
      });
    }
    
    // Store pagination info
    this.paginationInfo = data.pagination;
  }
  
  updateButtonText(collectionHandle) {
    if (!this.categoryButton) return;
    
    const option = this.dropdownContent.querySelector(`[data-collection-handle="${collectionHandle}"]`);
    if (option) {
      const title = option.textContent.split('(')[0].trim();
      this.categoryButton.textContent = title;
      this.categoryButton.appendChild(this.categoryButton.querySelector('.srs-dropdown-icon'));
    }
  }
  
  updateActiveOption(collectionHandle) {
    if (!this.dropdownContent) return;
    
    // Remove active class from all options
    this.dropdownContent.querySelectorAll('.srs-collection-option').forEach(option => {
      option.classList.remove('active');
    });
    
    // Add active class to current option
    const currentOption = this.dropdownContent.querySelector(`[data-collection-handle="${collectionHandle}"]`);
    if (currentOption) {
      currentOption.classList.add('active');
    }
  }
  
  updateCounts() {
    if (!this.currentCountElement || !this.totalCountElement) return;
    
    const productItems = this.productsContainer.querySelectorAll('.srs-product-item');
    const currentCount = productItems.length;
    
    // Get total count from collection option
    const currentOption = this.dropdownContent.querySelector(`[data-collection-handle="${this.currentCollection}"]`);
    if (currentOption) {
      const countText = currentOption.querySelector('.srs-collection-count').textContent;
      const totalCount = countText.replace(/[()]/g, '');
      
      this.currentCountElement.textContent = currentCount;
      this.totalCountElement.textContent = totalCount;
    }
  }
  
  updateLoadMoreButton() {
    if (!this.loadMoreButton || !this.paginationInfo) return;
    
    if (!this.paginationInfo.has_more) {
      this.loadMoreButton.style.display = 'none';
    } else {
      this.loadMoreButton.style.display = 'block';
    }
  }
  
  resetLoadMore() {
    if (this.loadMoreButton) {
      this.loadMoreButton.style.display = 'block';
    }
  }
  
  showLoadingState() {
    if (this.productsContainer) {
      this.productsContainer.style.opacity = '0.6';
    }
  }
  
  hideLoadingState() {
    if (this.productsContainer) {
      this.productsContainer.style.opacity = '1';
    }
  }
  
  showError(message) {
    if (!this.productsContainer) return;
    
    this.productsContainer.innerHTML = `
      <div class="srs-error-message" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6b6b;">
        <p>${message}</p>
      </div>
    `;
  }
}

// Initialize course filters when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const courseWrappers = document.querySelectorAll('.srs-course-card-wrapper');
  courseWrappers.forEach(wrapper => {
    new SRSCourseFilter(wrapper);
  });
});

// Export for potential use in other scripts
window.SRSCourseFilter = SRSCourseFilter;
