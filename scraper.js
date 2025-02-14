"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdultDVDEmpireScraper = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const node_fetch_1 = __importDefault(require("node-fetch"));
// const dateFormat = __importDefault(require("dateformat"));
const headers_1 = require("./utils/headers");
const cache_1 = require("./config/cache");

// Helper function to convert runtime format to total minutes
const convertRuntimeToMinutes = (runtimeStr) => {
  const regex = /(\d+)\s*hrs?\.\s*(\d+)\s*mins?\./;
  const match = runtimeStr.match(regex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
};

class AdultDVDEmpireScraper {
    baseUrl;
    headers;
    constructor(baseUrl = 'https://www.adultdvdempire.com') {
        this.baseUrl = baseUrl;
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Cookie': 'ageConfirmed=true'
        };
    }

    async createBrowser() {
        throw new Error('Method not implemented.');
    }



    async getDiscoverMovies(page = 1, cacheConfig) {

        return cache_1.cache.getOrSet(async () => {
            try {
                const response = await axios_1.default.get(`${this.baseUrl}/all-dvds.html?page=${page}`, {
                    headers: this.headers
                });

                const $ = cheerio_1.load(response.data);

                const results = [];
                const total_results = $('.list-page__results strong').text().replace(/,/g, '');
                const total_pages = $('.pagination li a[aria-label="Go to Last Page"]').text().trim().replace(/,/g, '');

                $('.grid-item').each((index, element) => { // Changed selector to get the correct parent container
                    const anchorTag = $(element).find('.product-details__item-title a');
                    const href = anchorTag.attr('href');
                    const title = anchorTag.text().trim();

                    const movieID = href.split('/')[1];
                    const poster_path = $(element).find('.boxcover-container img').attr('src') || '';



                    results.push({ 
                        id: movieID, 
                        original_title: title, 
                        poster_path, 
                        title
                    });
                });


                return {
                    page,
                    results,
                    total_results,
                    total_pages
                };
            } catch (error) {
                console.error('Error getting movie discover:', error);
                throw error;
            }
        }, cacheConfig.key, cacheConfig.duration);
    }

    async getMovieInfo(movieID, cacheConfig) {
        return cache_1.cache.getOrSet(async () => {
            try {
                const response = await axios_1.default.get(`${this.baseUrl}/${movieID}`, {
                    headers: this.headers
                });
                const $ = (0, cheerio_1.load)(response.data);
                // const dateFormat = (await import('dateformat')).default;

                // Extracting the title
                const raw_title = $('h1').text().trim();
                // Remove all newline and tab characters first
                const cleanedText = raw_title.replace(/[\n\t]+/g, ' ').trim();
                // Remove "- On Sale!" and everything after it
                const title = cleanedText.replace(/\s*- On Sale!.*$/, '').trim();

                // Extracting the backdrop path
                const backdropPathStyle = $('#previewContainer').attr('style');
                const backdrop_url = backdropPathStyle ? backdropPathStyle.match(/background-image:\s*url\(([^)]+)\)/)[1] : '';
                const backdrop_split = backdrop_url ? backdrop_url.split('/')[6] : '';
                const backdrop_path = 'https://caps1cdn.adultempire.com/o/1920/1080/' + backdrop_split;

                
                // Extracting genres
                const genres = [];
                $('.movie-page__content-tags__categories a').each((index, element) => {
                  const href = $(element).attr('href');
                  const name = $(element).text().trim();
                  const id = href ? href.split('/')[1] : '';
                  genres.push({ id, name });
                });

                // Extracting overview
                const overview = $('.synopsis-content').text().trim();

                // Extracting poster path
                const poster_path = $('.boxcover-container a').attr('data-href');

                // Extracting release date
                // const releaseDateElement = $('div.col-sm-4 ul.list-unstyled li').filter(function() {
                //   return $(this).text().trim().startsWith('Released:');
                // });

                // const releasedate = releaseDateElement.contents().filter(function() {
                //   return this.nodeType === 3; // Node type 3 is a text node
                // }).text().trim();

                // const release_date = dateFormat(releasedate, 'yyyy-mm-dd');

                // Extracting runtime
                const runtimeElement = $('div.col-sm-4 ul.list-unstyled li').filter(function() {
                  return $(this).text().trim().startsWith('Length:');
                });

                const runtimeStr = runtimeElement.contents().filter(function() {
                  return this.nodeType === 3; // Node type 3 is a text node
                }).text().trim();

                const runtime = convertRuntimeToMinutes(runtimeStr);

                // Extracting vote average
                const vote_average = $('.rating-stars-avg').text().trim();

                // Extracting vote count
                const vote_count = $('e-user-actions[:variant="\'like\'"]').attr(':count') || 0;

                // Extracting backdrops
                const backdrops = [];
                $('div.col-xs-6 img.img-full-responsive').each((index, element) => {
                  const file_url = $(element).attr('data-bgsrc');
                  if (file_url) {
                    const file_url_split = file_url ? file_url.split('/')[6] : '';
                    const file_path = 'https://caps1cdn.adultempire.com/o/1920/1080/' + file_url_split;
                    backdrops.push({ file_path });
                  }
                });

                const cast = [];
                $('.movie-page__content-tags__performers a').each((index, element) => {
                  const href = $(element).attr('href');
                  const name = $(element).text().trim();

                  const performerId = href ? href.split('/')[1] : '';
                  const profile_path = performerId ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg` : '';
                  cast.push({ id: performerId, name, profile_path, known_for_department: 'Acting' });
                });
            
                const crew = [];
                $('.movie-page__heading__movie-info a').each((index, element) => {
                  const href = $(element).attr('href');
                  const name = $(element).text().trim();
                  const crewId = href ? href.split('/')[1] : '';
                  const profile_path = crewId ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg` : '';
            
                  if (crewId) {
                    crew.push({ id: crewId, name, profile_path, known_for_department: 'Directing', department: 'Directing' });
                  }
                });

                return {
                    id: movieID,
                    title,
                    backdrop_path,
                    genres,
                    overview,
                    poster_path,
                    // release_date,
                    runtime,
                    vote_average,
                    vote_count,
                    images: { backdrops },
                    cast,
                    crew
                };
            }
            catch (error) {
                console.error('Error getting movie info:', error);
                throw error;
            }
        }, cacheConfig.key, cacheConfig.duration);
    }



    async getMovieCredits(movieID, cacheConfig) {
        return cache_1.cache.getOrSet(async () => {
            try {
                const response = await axios_1.default.get(`${this.baseUrl}/${movieID}`, {
                    headers: this.headers
                });
                const $ = (0, cheerio_1.load)(response.data);

                const cast = [];
                $('.movie-page__content-tags__performers a').each((index, element) => {
                  const href = $(element).attr('href');
                  const name = $(element).text().trim();

                  const performerId = href ? href.split('/')[1] : '';
                  const profile_path = performerId ? `https://imgs1cdn.adultempire.com/actors/${performerId}h.jpg` : '';
                  cast.push({ id: performerId, name, profile_path, known_for_department: 'Acting' });
                });
            
                const crew = [];
                $('.movie-page__heading__movie-info a').each((index, element) => {
                  const href = $(element).attr('href');
                  const name = $(element).text().trim();
                  const crewId = href ? href.split('/')[1] : '';
                  const profile_path = crewId ? `https://imgs1cdn.adultempire.com/studio/${crewId}.jpg` : '';
            
                  if (crewId) {
                    crew.push({ id: crewId, name, profile_path, known_for_department: 'Directing', department: 'Directing' });
                  }
                });

                return {
                    id: movieID,
                    cast,
                    crew
                };
            }
            catch (error) {
                console.error('Error getting movie credits info:', error);
                throw error;
            }
        }, cacheConfig.key, cacheConfig.duration);
    }



    async getPersonInfo(personID, cacheConfig) {
        return cache_1.cache.getOrSet(async () => {
            try {
                const response = await axios_1.default.get(`${this.baseUrl}/${personID}`, {
                    headers: this.headers
                });
                const $ = (0, cheerio_1.load)(response.data);

                const adult = 'true';
                const imdb_id = personID;
                const known_for_department = 'Acting';
                
                // Extracting the title
                const name = $('h1').text().trim();

                // Extracting overview
                const biography = $('.modal-body.text-md').html();

                // Extracting poster path
                const profile_path = personID ? `https://imgs1cdn.adultempire.com/actors/${personID}h.jpg` : '';


                return {
                    adult,
                    biography,
                    id: personID,
                    imdb_id,
                    known_for_department,
                    name,
                    profile_path
                };
            }
            catch (error) {
                console.error('Error getting person info:', error);
                throw error;
            }
        }, cacheConfig.key, cacheConfig.duration);
    }


}
exports.AdultDVDEmpireScraper = AdultDVDEmpireScraper;

module.exports = {
    AdultDVDEmpireScraper
};
