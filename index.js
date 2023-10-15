const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');


const scrape = async () => {
    const allCourses = [];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('https://www.bu.edu/phpbin/course-search/search.php?page=0&pagesize=10&adv=1&nolog=&search_adv_all=&yearsem_adv=2024-SPRG&credits=*&pathway=&hub_match=all&pagesize=10');
    while(true) {
        await page.waitForSelector('.coursearch-results', { timeout: 30000 });
        
        const html = await page.content();
        const $ = cheerio.load(html);
        const courses = $('.coursearch-results').find('.coursearch-result');
        
        courses.each((index, element) => {
            const heading = $(element).find('.coursearch-result-heading');
            const description = $(element).find('.coursearch-result-content-description');
            const hubs = [];
            $(element).find('.coursearch-result-hub-list').find('li').each((index, element) => {
                hubs.push($(element).text());
            });
            let prereq;
            
            try {
                prereq = $(description).find('p').get(0).children[0].data
            } catch {
                prereq = '';
            }
            const course = {
                courseCode: $(heading).find('h6').text(),
                courseTitle: $(heading).find('h2').text(),
                prerequisites: prereq,
                hubs: hubs,
            }
            allCourses.push(course);
            
        });
        try {
            // Click the next button and wait for the next page to load
            await page.waitForSelector('.coursearch-results-pagination-next', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.click('.coursearch-results-pagination-next');
            await page.waitForSelector('.coursearch-results', { timeout: 10000 });
        } catch (err){
            break;
        }
        
    }
    
    browser.close();
    //turn the object into a string and write it to a file in csv format
    const csv = convertToCSV(allCourses);
    fs.writeFileSync('courses.csv', csv);
    console.log('Scraping Complete!');
    
    
}

const convertToCSV = (objArray) => {
    const array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    let str = `${Object.keys(array[0]).join(',')}` + '\r\n';
    
    for (let i = 0; i < array.length; i++) {
        let line = '';
        for (let index in array[i]) {
            if (line != '') line += ','
            
            line += array[i][index];
        }
        
        str += line + '\r\n';
    }
    
    return str;
}

scrape();


