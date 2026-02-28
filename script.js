// localStorage.clear();
class FoodExpiryManager {
    constructor() {
        this.foods = JSON.parse(localStorage.getItem('foods')) || this.getDefaultFoods();
        this.references = JSON.parse(localStorage.getItem('references')) || this.getDefaultReferences();
        
        if (!localStorage.getItem('references')) {
            this.saveReferencesToStorage();
        }
        if (!localStorage.getItem('foods')) {
            this.saveToStorage();
        }
        
        this.initializeElements();
        this.bindEvents();
        this.renderReferences();
        this.updateFoodNameOptions();
        this.render();
        
        // Initial check on load
        this.updateExpiryStatus();
        // Check every 24 hours
        setInterval(() => this.updateExpiryStatus(), 86400000);
    }

    initializeElements() {
        this.foodNameSelect = document.getElementById('foodName');
        this.storageLocationSelect = document.getElementById('storageLocation');
        this.storagePeriodInput = document.getElementById('storagePeriod');
        this.expiryDateInput = document.getElementById('expiryDate');
        // Capture the email input element
        this.userEmailInput = document.getElementById('userEmail');
        this.addBtn = document.getElementById('addBtn');
        this.foodItemsContainer = document.getElementById('foodItems');
        
        this.referenceNameInput = document.getElementById('referenceName');
        this.referencePeriodInput = document.getElementById('referencePeriod');
        this.referenceLocationInput = document.getElementById('referenceLocation');
        this.addReferenceBtn = document.getElementById('addReferenceBtn');
        this.referenceItemsContainer = document.getElementById('referenceItems');
    }

    bindEvents() {
        this.addBtn.addEventListener('click', () => this.addFood());
        this.addReferenceBtn.addEventListener('click', () => this.addReference());
        
        // Listen for Enter key on all inputs including the email field
        const inputs = [this.foodNameSelect, this.storageLocationSelect, this.storagePeriodInput, this.expiryDateInput, this.userEmailInput];
        inputs.forEach(input => {
            if(input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addFood();
                });
            }
        });

        this.storagePeriodInput.addEventListener('input', () => this.calculateExpiryDate());
        this.foodNameSelect.addEventListener('change', () => this.onFoodSelected());
    }

    calculateExpiryDate() {
        const storagePeriod = parseInt(this.storagePeriodInput.value);
        if (storagePeriod > 0) {
            const today = new Date();
            const expiryDate = new Date(today.getTime() + (storagePeriod * 24 * 60 * 60 * 1000));
            this.expiryDateInput.value = expiryDate.toISOString().split('T')[0];
        }
    }

    addFood() {
        const foodName = this.foodNameSelect.value;
        const storageLocation = this.storageLocationSelect.value;
        const storagePeriod = this.storagePeriodInput.value;
        const expiryDate = this.expiryDateInput.value;
        const email = this.userEmailInput ? this.userEmailInput.value : '';

        if (!foodName || !storageLocation || !storagePeriod || !expiryDate || !email) {
            alert('Please fill in all fields, including your email');
            return;
        }

        const food = {
            id: Date.now().toString(),
            name: foodName,
            location: storageLocation,
            period: parseInt(storagePeriod),
            expiryDate: expiryDate,
            email: email, // Email is now stored correctly
            addedDate: new Date().toISOString().split('T')[0],
            reminderSent: false
        };

        this.foods.push(food);
        this.saveToStorage();
        this.clearInputs();
        this.render();
        
        // Check status immediately after adding in case it expires soon
        this.updateExpiryStatus();
    }

    deleteFood(id) {
        if (confirm('Delete this item?')) {
            this.foods = this.foods.filter(food => food.id !== id);
            this.saveToStorage();
            this.render();
        }
    }

    clearInputs() {
        this.foodNameSelect.value = '';
        this.storageLocationSelect.value = '';
        this.storagePeriodInput.value = '';
        this.expiryDateInput.value = '';
        // Note: We leave the email input filled for user convenience
    }

    saveToStorage() {
        localStorage.setItem('foods', JSON.stringify(this.foods));
    }

    calculateRemainingDays(expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getRemainingDaysClass(days) {
        if (days < 0) return 'expired';
        if (days <= 3) return 'warning';
        return 'safe';
    }

    getRemainingDaysText(days) {
        if (days < 0) return `Expired ${Math.abs(days)}d ago`;
        if (days === 0) return 'Expires Today';
        if (days === 1) return 'Expires Tomorrow';
        return `${days} days left`;
    }

    updateExpiryStatus() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.foods.forEach(food => {
            const expiry = new Date(food.expiryDate);
            expiry.setHours(0, 0, 0, 0);
            
            const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

            // Reminder triggers if expiring in 2 days or less and hasn't been sent
            if (diffDays <= 2 && diffDays >= 0 && !food.reminderSent) {
                sendReminderEmail(food.name, food.expiryDate, food.email);
                food.reminderSent = true;
            }
        });

        this.saveToStorage();
        this.render();
    }

    render() {
        if (this.foods.length === 0) {
            this.foodItemsContainer.innerHTML = '<div class="empty-state">No items registered yet</div>';
            return;
        }

        const sortedFoods = [...this.foods].sort((a, b) => {
            return new Date(a.expiryDate) - new Date(b.expiryDate);
        });

        this.foodItemsContainer.innerHTML = sortedFoods.map(food => {
            const remainingDays = this.calculateRemainingDays(food.expiryDate);
            const statusClass = this.getRemainingDaysClass(remainingDays);
            const statusText = this.getRemainingDaysText(remainingDays);

            return `
                <div class="food-item">
                    <span>${food.name}</span>
                    <span>${food.location}</span>
                    <span>${food.period}d</span>
                    <span>${food.expiryDate}</span>
                    <span class="days-remaining ${statusClass}">${statusText}</span>
                    <button class="delete-btn" onclick="foodManager.deleteFood('${food.id}')">Delete</button>
                </div>
            `;
        }).join('');
    }

    // --- Guide / Reference Logic ---

    getDefaultReferences() {
        return [
            { id: '1', name: 'Carrots', period: '2 weeks', location: 'Crisper Drawer' },
            { id: '2', name: 'Cucumber', period: '5 days', location: 'Crisper Drawer' },
            { id: '3', name: 'Tomatoes', period: '5 days', location: 'Pantry' },
            { id: '4', name: 'Cabbage', period: '2 weeks', location: 'Crisper Drawer' },
            { id: '5', name: 'Bell Peppers', period: '10 days', location: 'Crisper Drawer' },
            { id: '6', name: 'Onions', period: '3 weeks', location: 'Pantry' },
            { id: '7', name: 'Potatoes', period: '3 weeks', location: 'Pantry' },
            { id: '8', name: 'Milk', period: '7 days', location: 'Fridge' },
            { id: '9', name: 'Bread', period: '5 days', location: 'Pantry' },
            { id: '10', name: 'Curd/Yogurt', period: '10 days', location: 'Fridge' },
            { id: '11', name: 'Eggs', period: '3 weeks', location: 'Fridge' },
            { id: '12', name: 'Chicken (Raw)', period: '2 days', location: 'Fridge' },
            { id: '13', name: 'Meat (Raw)', period: '3 days', location: 'Fridge' },
            { id: '14', name: 'Cooked Leftovers', period: '4 days', location: 'Fridge' }
        ];
    }

    getDefaultFoods() { return []; }

    addReference() {
        const name = this.referenceNameInput.value.trim();
        const location = this.referenceLocationInput.value.trim();
        const period = this.referencePeriodInput.value.trim();

        if (!name || !location || !period) {
            alert('Please fill in all reference fields');
            return;
        }

        const reference = {
            id: Date.now().toString(),
            name: name,
            period: period,
            location: location
        };

        this.references.push(reference);
        this.saveReferencesToStorage();
        this.clearReferenceInputs();
        this.renderReferences();
    }

    deleteReference(id) {
        if (confirm('Delete this reference?')) {
            this.references = this.references.filter(ref => ref.id !== id);
            this.saveReferencesToStorage();
            this.renderReferences();
        }
    }

    clearReferenceInputs() {
        this.referenceNameInput.value = '';
        this.referenceLocationInput.value = '';
        this.referencePeriodInput.value = '';
    }

    saveReferencesToStorage() {
        localStorage.setItem('references', JSON.stringify(this.references));
    }

    renderReferences() {
        this.referenceItemsContainer.innerHTML = this.references.map(ref => `
            <div class="reference-item">
                <span>${ref.name}</span>
                <span>${ref.location}</span>
                <span>${ref.period}</span>
                <button class="delete-reference-btn" onclick="foodManager.deleteReference('${ref.id}')">Delete</button>
            </div>
        `).join('');
        this.updateFoodNameOptions();
    }

    updateFoodNameOptions() {
        const currentValue = this.foodNameSelect.value;
        this.foodNameSelect.innerHTML = '<option value="">Select Food</option>';
        this.references.forEach(ref => {
            const option = document.createElement('option');
            option.value = ref.name;
            option.textContent = ref.name;
            this.foodNameSelect.appendChild(option);
        });
        if (currentValue) this.foodNameSelect.value = currentValue;
    }

    onFoodSelected() {
        const selectedFood = this.foodNameSelect.value;
        if (!selectedFood) return;

        const reference = this.references.find(ref => ref.name === selectedFood);
        if (reference) {
            this.storageLocationSelect.value = reference.location;
            this.storagePeriodInput.value = this.extractDaysFromPeriod(reference.period);
            this.calculateExpiryDate();
        }
    }

    extractDaysFromPeriod(periodText) {
        const dayMatch = periodText.match(/(\d+)～?(\d+)?\s*(day|d)/i);
        if (dayMatch) return dayMatch[2] ? parseInt(dayMatch[2]) : parseInt(dayMatch[1]);
        
        const weekMatch = periodText.match(/(\d+)～?(\d+)?\s*(week|w)/i);
        if (weekMatch) {
            const weeks = weekMatch[2] ? parseInt(weekMatch[2]) : parseInt(weekMatch[1]);
            return weeks * 7;
        }
        return 7;
    }
}

// Global Email Sending Function
function sendReminderEmail(foodName, expiryDate, email) {
    if (!email) {
        console.log("No email address found for", foodName);
        return;
    }

    const templateParams = {
        item_name: foodName,
        expiry_date: expiryDate,
        to_email: email
    };

    emailjs.send("service_llp2u38", "template_6l7hw3i", templateParams)
        .then(() => console.log(`Reminder sent successfully to ${email}`))
        .catch((error) => console.error("Email failed to send:", error));
}

const foodManager = new FoodExpiryManager();