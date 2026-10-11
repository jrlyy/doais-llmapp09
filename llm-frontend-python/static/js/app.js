document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const inputText = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeAllBtn = document.getElementById('analyzeAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const resultsList = document.getElementById('resultsList');
    const optionBtns = document.querySelectorAll('.option-btn');

    let selectedAnalysis = 'summarize';
    let isLoading = false;

    const analysisTypes = {
        summarize: { label: 'Summarize', icon: '\u{1F4DD}' },
        sentiment: { label: 'Sentiment', icon: '\u{1F60A}' },
        intent: { label: 'Intent', icon: '\u{1F3AF}' },
        classify: { label: 'Classify', icon: '\u{1F3F7}\u{FE0F}' }
    };

    const demoHint = document.getElementById('demoHint');
    const nextExampleBtn = document.getElementById('nextExampleBtn');

    // Ghost demo text shown as the placeholder for new users
    const demoExamples = [
        "Hi, I was charged twice for my subscription this month and I'm really frustrated. Can you refund the extra payment as soon as possible?",
        "I just upgraded to the Pro plan and the new dashboard is fantastic! The reports load so much faster now. Is there a way to export them to Excel?",
        "Our team meeting is moved to Thursday at 3pm. Please review the Q3 sales figures beforehand and bring your questions about the new pricing model.",
        "The app keeps crashing every time I try to upload a photo on my phone. I've already reinstalled it twice. How do I fix this?",
        "Scientists have discovered that regular walks of just 20 minutes a day can lower stress levels and improve sleep quality, according to a new study."
    ];
    let demoIndex = 0;

    function showDemoPlaceholder() {
        inputText.placeholder = demoExamples[demoIndex];
    }

    function updateDemoHint() {
        demoHint.style.display = inputText.value.length === 0 ? 'block' : 'none';
    }

    function useDemoExample() {
        inputText.value = demoExamples[demoIndex];
        inputText.dispatchEvent(new Event('input'));
    }

    showDemoPlaceholder();

    // Tab on an empty box accepts the ghost text
    inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey && inputText.value.length === 0) {
            e.preventDefault();
            useDemoExample();
        }
    });

    nextExampleBtn.addEventListener('click', () => {
        demoIndex = (demoIndex + 1) % demoExamples.length;
        showDemoPlaceholder();
        inputText.focus();
    });

    // Character count
    inputText.addEventListener('input', () => {
        charCount.textContent = `${inputText.value.length} characters`;
        updateDemoHint();
        updateButtonStates();
    });

    // Analysis type selection
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLoading) return;
            optionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAnalysis = btn.dataset.type;
        });
    });

    // Analyze button
    analyzeBtn.addEventListener('click', () => analyze());

    // Run All button
    analyzeAllBtn.addEventListener('click', () => analyzeAll());

    // Clear All button
    clearAllBtn.addEventListener('click', () => {
        inputText.value = '';
        charCount.textContent = '0 characters';
        updateDemoHint();
        clearResults();
        hideError();
        updateButtonStates();
    });

    // Clear Results button
    clearResultsBtn.addEventListener('click', () => clearResults());

    function updateButtonStates() {
        const hasText = inputText.value.trim().length > 0;
        analyzeBtn.disabled = isLoading || !hasText;
        analyzeAllBtn.disabled = isLoading || !hasText;
        clearAllBtn.disabled = isLoading;

        // Disable/enable option buttons and textarea during loading
        optionBtns.forEach(btn => btn.disabled = isLoading);
        inputText.disabled = isLoading;
    }

    function setLoading(loading) {
        isLoading = loading;
        updateButtonStates();

        if (loading) {
            analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';
        } else {
            analyzeBtn.textContent = 'Analyze';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function clearResults() {
        resultsList.innerHTML = '';
        emptyState.style.display = 'flex';
        clearResultsBtn.style.display = 'none';
    }

    function updateResultsVisibility() {
        const hasResults = resultsList.children.length > 0;
        emptyState.style.display = hasResults ? 'none' : 'flex';
        clearResultsBtn.style.display = hasResults ? 'inline-flex' : 'none';
    }

    function formatTimestamp(date) {
        return date.toLocaleString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function formatConfidence(confidence) {
        return (confidence * 100).toFixed(1) + '%';
    }

    function getSentimentClass(sentiment) {
        switch (sentiment?.toLowerCase()) {
            case 'positive': return 'sentiment-positive';
            case 'negative': return 'sentiment-negative';
            default: return 'sentiment-neutral';
        }
    }

    function renderResultCard(type, data) {
        const info = analysisTypes[type];
        const timestamp = formatTimestamp(new Date());

        let contentHtml = '';

        if (type === 'summarize' && data.summary !== undefined) {
            const keyPointsHtml = (data.keyPoints || [])
                .map(p => `<li>${escapeHtml(p)}</li>`)
                .join('');
            contentHtml = `
                <div class="summary-result">
                    <div class="result-field">
                        <label>Summary</label>
                        <p>${escapeHtml(data.summary)}</p>
                    </div>
                    <div class="result-field">
                        <label>Key Points</label>
                        <ul class="key-points">${keyPointsHtml}</ul>
                    </div>
                    <div class="result-meta">
                        <span class="meta-item">Word Count: ${data.wordCount}</span>
                    </div>
                </div>`;
        } else if (type === 'sentiment' && data.overallSentiment !== undefined) {
            const emotionsHtml = (data.emotions || [])
                .map(e => `<span class="tag emotion-tag">${escapeHtml(e)}</span>`)
                .join('');
            contentHtml = `
                <div class="sentiment-result">
                    <div class="sentiment-main ${getSentimentClass(data.overallSentiment)}">
                        <span class="sentiment-label">${escapeHtml(data.overallSentiment)}</span>
                        <span class="sentiment-score">Score: ${Number(data.sentimentScore).toFixed(2)}</span>
                    </div>
                    <div class="result-field">
                        <label>Emotions Detected</label>
                        <div class="tags">${emotionsHtml}</div>
                    </div>
                    <div class="result-meta">
                        <span class="meta-item">Confidence: ${formatConfidence(data.confidence)}</span>
                    </div>
                </div>`;
        } else if (type === 'intent' && data.primaryIntent !== undefined) {
            const secondaryHtml = (data.secondaryIntents || [])
                .map(i => `<span class="tag">${escapeHtml(i)}</span>`)
                .join('');
            contentHtml = `
                <div class="intent-result">
                    <div class="result-field">
                        <label>Primary Intent</label>
                        <p class="primary-value">${escapeHtml(data.primaryIntent)}</p>
                    </div>
                    <div class="result-field">
                        <label>Intent Category</label>
                        <span class="tag category-tag">${escapeHtml(data.intentCategory)}</span>
                    </div>
                    <div class="result-field">
                        <label>Secondary Intents</label>
                        <div class="tags">${secondaryHtml}</div>
                    </div>
                    <div class="result-meta">
                        <span class="meta-item">Confidence: ${formatConfidence(data.confidence)}</span>
                    </div>
                </div>`;
        } else if (type === 'classify' && data.primaryCategory !== undefined) {
            const labelsHtml = (data.labels || [])
                .map(l => `<span class="tag label-tag">${escapeHtml(l)}</span>`)
                .join('');
            contentHtml = `
                <div class="classification-result">
                    <div class="result-field">
                        <label>Primary Category</label>
                        <p class="primary-value">${escapeHtml(data.primaryCategory)}</p>
                    </div>
                    <div class="result-field">
                        <label>Labels</label>
                        <div class="tags">${labelsHtml}</div>
                    </div>
                    <div class="result-meta">
                        <span class="meta-item">Confidence: ${formatConfidence(data.confidence)}</span>
                    </div>
                </div>`;
        }

        const cardHtml = `
            <div class="result-card" data-type="${type}">
                <div class="result-header">
                    <span class="result-type">
                        <span class="type-icon">${info.icon}</span>
                        ${escapeHtml(info.label)}
                    </span>
                    <span class="result-time">${timestamp}</span>
                </div>
                <div class="result-content">
                    ${contentHtml}
                </div>
            </div>`;

        resultsList.insertAdjacentHTML('afterbegin', cardHtml);
        updateResultsVisibility();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function analyze() {
        const text = inputText.value.trim();
        if (!text) {
            showError('Please enter some text to analyze');
            return;
        }

        setLoading(true);
        hideError();

        try {
            const response = await fetch(`/api/ai/${selectedAnalysis}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Analysis failed (${response.status})`);
            }

            const data = await response.json();
            renderResultCard(selectedAnalysis, data);
        } catch (err) {
            showError(err.message || 'An error occurred while analyzing the text');
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function analyzeAll() {
        const text = inputText.value.trim();
        if (!text) {
            showError('Please enter some text to analyze');
            return;
        }

        setLoading(true);
        hideError();

        const types = ['summarize', 'sentiment', 'intent', 'classify'];
        const promises = types.map(type =>
            fetch(`/api/ai/${type}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `${type} analysis failed`);
                }
                return { type, data: await response.json() };
            })
            .catch(err => {
                console.error(`${type} analysis error:`, err);
                return null;
            })
        );

        const results = await Promise.all(promises);
        results.forEach(result => {
            if (result) {
                renderResultCard(result.type, result.data);
            }
        });

        setLoading(false);
    }
});
