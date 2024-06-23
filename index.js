/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

// get all subjects:               https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_CatalogSubjects?institution=BU001
// get all courses for a subject: https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_SubjectCourses?institution=BU001&subject=CASAA
// get course details for a certain course:https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_CatalogCourseDetails?course_id=180000
const axios = require('axios');
const fs = require('fs');
const { format } = require('path');

const cookie = 'ExpirePage=https://public.mybustudent.bu.edu/psc/BUPRD/; PS_DEVICEFEATURES=new:1; PS_LASTSITE=https://public.mybustudent.bu.edu/psc/BUPRD/; PS_LOGINLIST=https://public.mybustudent.bu.edu/BUPRD; PS_TOKEN=pQAAAAQDAgEBAAAAvAIAAAAAAAAsAAAABABTaGRyAk4Acwg4AC4AMQAwABR5lgzS43rHR/sTpDo+vD3h4+tuEmUAAAAFAFNkYXRhWXicLYlBDkAwFERfEUsL99BIVVlXsBMJ1g7heg5niP+SN5M/F5CliTHKO+G7MnJwMrDJq3okH1mYKVb9JvZ/9Y4ah6dSBtmJt7dYGjrZC6st0IugjQfiTwyR; PS_TOKENEXPIRE=22_Jun_2024_13:47:20_GMT; PS_TokenSite=https://public.mybustudent.bu.edu/psc/BUPRD/?public-PORTAL-PSJSESSIONID; SignOnDefault=; X-Oracle-BMC-LBS-Route=540f904ca7855914842283d6480e605e7df6ba23e75e63566915a64c6ac704bcdc340990d42672ca8601f87b4028ae8498464c2c05192a70964a6df2; hpt_institution=BU001; lcsrftoken=MB40v5W+vey/ZJFGJN2phPwPK+ACfB3tfJLjWMrnEu4=; public-PORTAL-PSJSESSIONID=x6hAKswlB0F429m-hxQRvuSETp_4fKBr!-158832294';

const numRequests = 50; // number of requests to make at once

async function getCourses() {
  const allCourses = {};
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_CatalogSubjects?institution=BU001',
    headers: {
      Cookie: cookie,
    },
  };

  const res = await axios.request(config);
  const { subjects } = res.data;
  const subjectCodes = subjects.map((subject) => subject.subject);
  console.log(subjectCodes);

  const instance = await axios.create({
    maxBodyLength: Infinity,
    baseURL: 'https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_SubjectCourses?institution=BU001',
    headers: {
      Cookie: cookie,
    },
  });

  for (let i = 0; i < subjects.length; i += numRequests) {
    const promises = [];
    for (let j = 0; j < numRequests; j += 1) {
      console.log(i + j, subjectCodes[i + j]);
      promises.push(instance.get(`&subject=${subjectCodes[i + j]}`));
    }
    const pRes = await Promise.all(promises);
    pRes.forEach((courseRes, index) => {
      const { courses } = courseRes.data;
      allCourses[subjectCodes[i + index]] = courses;
    });
  }
  fs.writeFileSync('courses.json', JSON.stringify(allCourses));
}

async function getCourseDetails() {
  const details = {};
  const courses = JSON.parse(await fs.promises.readFile('courses.json'));
  const instance = await axios.create({
    maxBodyLength: Infinity,
    baseURL: 'https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_COURSE_CATALOG.FieldFormula.IScript_CatalogCourseDetails',
    headers: {
      Cookie: cookie,
    },
  });

  for (let x = 0; x < Object.keys(courses).length; x += 1) {
    const subject = Object.keys(courses)[x];
    console.log(subject);
    console.log(courses[subject].length);
    for (let i = 0; i < courses[subject].length; i += numRequests) {
      const promises = [];
      for (let j = 0; j < numRequests && (i + j) < courses[subject].length; j += 1) {
        console.log(courses[subject][i + j]);
        const course = courses[subject][i + j];
        console.log('COURSE', course);
        if (course && course.crse_id) {
          promises.push(instance.get(`?course_id=${course.crse_id}`));
        }
      }
      const res = await Promise.all(promises);
      res.forEach((courseRes, index) => {
        console.log(courseRes.data);
        details[courses[subject[i + index]].crse_id] = courseRes.data;
      });
      console.log(details.length);
    }
  }
  fs.writeFileSync('details.json', JSON.stringify(courses));
}

function prepareJSON() {
  const courses = JSON.parse(fs.readFileSync('courses.json'));
  const details = JSON.parse(fs.readFileSync('details.json'));
  const allCourses = {};
  for (const subject in courses) {
    allCourses[subject] = [];
    for (const course of courses[subject]) {
      allCourses[subject].push({
        ...course,
        ...details[course.crse_id],
      });
    }
  }
  fs.writeFileSync('allCourses.json', JSON.stringify(allCourses));
}

const formatCourses = () => {
  const courses = JSON.parse(fs.readFileSync('courses.json'));
  const formattedCourses = [];
  for (const subject in courses) {
    formattedCourses.push({
      subject,
      courses: courses[subject],
    });
  }
  fs.writeFileSync('courses.json', JSON.stringify({ subjects: formattedCourses }));
};

// getCourseDetails();
// prepareJSON();
getCourses();
formatCourses();
