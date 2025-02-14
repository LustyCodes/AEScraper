const express = require('express');
const { AdultDVDEmpireScraper } = require('./scraper');
const router = express.Router();

// Initialize the scraper
const scraper = new AdultDVDEmpireScraper();

// Default cache configuration
const DEFAULT_CACHE_CONFIG = {
    duration: 43200, // 12 hours in seconds
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: err.message
    });
};


// Search movies
router.get('/discover/movie', async (req, res, next) => {
    try {
        const { page } = req.query; // Fixed: Extract page from req.query
        const discover = await scraper.getDiscoverMovies(page, {
            key: `discover:${page}`,
            ...DEFAULT_CACHE_CONFIG
        });
        res.json({
            success: true,
            ...discover // Spread the movie data directly
        });
    } catch (error) {
        next(error);
    }
});



// Get movie info
router.get('/movie/:movieID', async (req, res, next) => {
    try {
        const { movieID } = req.params;
        const movie = await scraper.getMovieInfo(movieID, {
            key: `movie:${movieID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        res.json({
            success: true,
            // data: movie
            ...movie
        });
    } catch (error) {
        next(error);
    }
});


// Get movie credits
router.get('/movie/:movieID/credits', async (req, res, next) => {
    try {
        const { movieID } = req.params;
        const credits = await scraper.getMovieCredits(movieID, {
            key: `credits:${movieID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        res.json({
            success: true,
            // data: credits
            ...credits
        });
    } catch (error) {
        next(error);
    }
});


// Get person info
router.get('/person/:personID', async (req, res, next) => {
    try {
        const { personID } = req.params;
        const person = await scraper.getPersonInfo(personID, {
            key: `person:${personID}`,
            ...DEFAULT_CACHE_CONFIG
        });
        res.json({
            success: true,
            // data: person
            ...person
        });
    } catch (error) {
        next(error);
    }
});



// Apply error handler
router.use(errorHandler);

module.exports = router; 
