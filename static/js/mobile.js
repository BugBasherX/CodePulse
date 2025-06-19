/**
 * Mobile-specific enhancements for CodePulse
 * Optimized for Android and iOS devices
 */

class MobileHandler {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
        this.isMobile = this.isIOS || this.isAndroid || window.innerWidth <= 768;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isScrolling = false;
        
        this.init();
    }
    
    init() {
        this.setupViewportHeight();
        this.setupTouchHandlers();
        this.setupPullToRefresh();
        this.setupMobileNavigation();
        this.setupFormEnhancements();
        this.setupTableEnhancements();
        this.setupModalEnhancements();
        this.setupToastPosition();
        
        // iOS specific fixes
        if (this.isIOS) {
            this.setupIOSFixes();
        }
        
        // Android specific fixes
        if (this.isAndroid) {
            this.setupAndroidFixes();
        }
        
        // Orientation change handler
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setupViewportHeight(), 500);
        });
        
        window.addEventListener('resize', () => {
            this.setupViewportHeight();
        });
    }
    
    setupViewportHeight() {
        // Fix iOS viewport height issues
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setupTouchHandlers() {
        // Add touch feedback for buttons
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
                const btn = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
                btn.style.transform = 'scale(0.95)';
                btn.style.transition = 'transform 0.1s ease';
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
                const btn = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
                setTimeout(() => {
                    btn.style.transform = 'scale(1)';
                }, 100);
            }
        });
        
        // Prevent double-tap zoom on buttons
        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('btn') || 
                e.target.closest('.btn') || 
                e.target.classList.contains('nav-link')) {
                e.preventDefault();
            }
        });
    }
    
    setupPullToRefresh() {
        if (!this.isMobile) return;
        
        let startY = 0;
        let pullDistance = 0;
        const threshold = 100;
        let isPulling = false;
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = false;
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY > 0) {
                pullDistance = e.touches[0].pageY - startY;
                if (pullDistance > 10) {
                    isPulling = true;
                    e.preventDefault();
                    
                    if (pullDistance > threshold) {
                        document.body.style.transform = `translateY(${Math.min(pullDistance * 0.5, 50)}px)`;
                        document.body.style.transition = 'transform 0.2s ease';
                    }
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isPulling && pullDistance > threshold) {
                // Refresh the page
                window.location.reload();
            }
            
            document.body.style.transform = '';
            document.body.style.transition = '';
            startY = 0;
            pullDistance = 0;
            isPulling = false;
        });
    }
    
    setupMobileNavigation() {
        // Improve mobile navigation
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        if (navbarToggler && navbarCollapse) {
            // Close navbar when clicking outside
            document.addEventListener('click', (e) => {
                if (!navbarCollapse.contains(e.target) && 
                    !navbarToggler.contains(e.target) && 
                    navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            });
            
            // Close navbar when clicking nav links
            const navLinks = navbarCollapse.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (navbarCollapse.classList.contains('show')) {
                        setTimeout(() => navbarToggler.click(), 150);
                    }
                });
            });
        }
    }
    
    setupFormEnhancements() {
        // Prevent zoom on form inputs (iOS)
        if (this.isIOS) {
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (!input.style.fontSize) {
                    input.style.fontSize = '16px';
                }
            });
        }
        
        // Add loading states to forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
                    submitBtn.disabled = true;
                }
            });
        });
    }
    
    setupTableEnhancements() {
        // Make tables more touch-friendly
        const tables = document.querySelectorAll('.table-responsive');
        tables.forEach(table => {
            table.style.overflowX = 'auto';
            table.style.webkitOverflowScrolling = 'touch';
            
            // Add scroll indicators
            const scrollIndicator = document.createElement('div');
            scrollIndicator.className = 'scroll-indicator';
            scrollIndicator.innerHTML = '← Scroll horizontally →';
            scrollIndicator.style.cssText = `
                text-align: center;
                font-size: 0.75rem;
                color: #6c757d;
                padding: 0.5rem;
                display: ${table.scrollWidth > table.clientWidth ? 'block' : 'none'};
            `;
            table.parentNode.insertBefore(scrollIndicator, table.nextSibling);
        });
    }
    
    setupModalEnhancements() {
        // Improve modal behavior on mobile
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('show.bs.modal', () => {
                // Prevent body scroll on iOS
                if (this.isIOS) {
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                }
            });
            
            modal.addEventListener('hidden.bs.modal', () => {
                if (this.isIOS) {
                    document.body.style.position = '';
                    document.body.style.width = '';
                }
            });
        });
    }
    
    setupToastPosition() {
        // Position toasts better on mobile
        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer && this.isMobile) {
            toastContainer.style.cssText = `
                position: fixed !important;
                top: 20px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
                width: calc(100% - 2rem) !important;
                max-width: 400px !important;
            `;
        }
    }
    
    setupIOSFixes() {
        // Fix iOS specific issues
        
        // Prevent bounce scroll
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.modal-body') || e.target.closest('.table-responsive')) {
                return; // Allow scroll in specific areas
            }
            
            if (window.scrollY === 0 && e.touches[0].pageY > this.touchStartY) {
                e.preventDefault();
            }
            
            if (window.scrollY + window.innerHeight >= document.body.scrollHeight && 
                e.touches[0].pageY < this.touchStartY) {
                e.preventDefault();
            }
        });
        
        // Fix iOS input focus issues
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }, 300);
            });
        });
        
        // Fix iOS Safari address bar hide/show
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop) {
                // Scrolling down
                document.body.classList.add('scroll-down');
            } else {
                // Scrolling up
                document.body.classList.remove('scroll-down');
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        });
    }
    
    setupAndroidFixes() {
        // Fix Android specific issues
        
        // Improve touch response
        document.addEventListener('touchstart', () => {
            // Empty handler to improve touch response on Android
        });
        
        // Fix keyboard issues
        const originalHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            if (window.innerHeight < originalHeight * 0.75) {
                // Keyboard is probably open
                document.body.classList.add('keyboard-open');
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });
    }
    
    // Utility methods
    showMobileToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    vibrate(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    addToHomeScreen() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                }
                this.deferredPrompt = null;
            });
        }
    }
}

// Initialize mobile handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileHandler = new MobileHandler();
});

// PWA support
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button if needed
    const installBtn = document.querySelector('#install-app-btn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
            window.mobileHandler.addToHomeScreen();
        });
    }
});