document.addEventListener('DOMContentLoaded', () => {
    const patientDataForm = document.getElementById('patientDataForm');
    const conditionProportionForm = document.getElementById('conditionProportionForm');
    const conditionByAgeGroupForm = document.getElementById('conditionByAgeGroupForm');

    if (patientDataForm) {
        patientDataForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patientName = e.target.patientName.value;
            const response = await fetch('/requestData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ search_type: 'patient_data', search_term: patientName }),
            });
            const data = await response.json();
            renderPatientDataTable(data);
        });
    }

    if (conditionProportionForm) {
        conditionProportionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const condition = e.target.condition.value;
            const response = await fetch('/requestData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ search_type: 'condition_proportion', search_term: condition }),
            });
            const data = await response.json();
            renderConditionProportionChart(data);
        });
    }

    if (conditionByAgeGroupForm) {
        conditionByAgeGroupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const condition = e.target.condition.value;
            const response = await fetch('/requestData', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ search_type: 'condition_by_age_group', search_term: condition }),
            });
            const data = await response.json();
            renderConditionByAgeGroupChart(data);
        });
    }

    function renderPatientDataTable(data) {
        console.log("data in table", data);
        const tableBody = d3.select('#patientDataTable tbody');
        tableBody.html('');

        data.forEach((patient) => {
            const row = tableBody.append('tr');
            row.append('td').text(patient.timestamp);
            row.append('td').text(patient.data.patient_id);
            row.append('td').text(patient.data.name);
            row.append('td').text(patient.data.age);
            row.append('td').text(patient.data.condition);
        });
    }

    function renderConditionProportionChart(data) {
        const width = document.getElementById('conditionProportionChart').clientWidth;
        const height = document.getElementById('conditionProportionChart').clientHeight;
        const radius = Math.min(width, height) / 2 - 60; // Adjust the radius to make room for the legend
    
        const svg = d3.select('#conditionProportionChart')
            .html('')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
        const color = d3.scaleOrdinal()
            .domain(['With Condition', 'Without Condition'])
            .range(['#ff7f50', '#1f77b4']);
    
        const pie = d3.pie()
            .value((d) => d.value)
            .sort(null);
    
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);
    
        const data_ready = pie([
            { name: 'With Condition', value: data.people_with_condition },
            { name: 'Without Condition', value: data.total_people - data.people_with_condition }
        ]);
    
        const slices = svg.selectAll('path')
            .data(data_ready)
            .enter()
            .append('g');
    
        slices.append('path')
            .attr('d', arc)
            .attr('fill', (d) => color(d.data.name))
            .attr('stroke', 'white')
            .style('stroke-width', '2px');

        slices.append('text')
            .attr('transform', (d) => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '50px') // Change to increase font size
            .attr('fill', 'white') // Set text color on chart
            .text((d) => d.data.value);
        
    
        const legend = svg.selectAll('.legend')
            .data(data_ready)
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', (d, i) => `translate(${radius + 20}, ${i * 30 - 30})`);
    
        legend.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .style('fill', (d) => color(d.data.name));
    
        legend.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text((d) => d.data.name);
    
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', 0)
            .attr('y', -height / 2 + 40) // Increase this value to push the title lower
            .attr('text-anchor', 'middle')
            .attr('font-size', '30px') // Change to increase font size
            .text(`Proportion of Patients with Condition: ${data.condition}`);
    } // end of pie chart function

    function renderConditionByAgeGroupChart(data) {
        const width = document.getElementById('conditionByAgeGroupChart').clientWidth;
        const height = document.getElementById('conditionByAgeGroupChart').clientHeight;
        const margin = { top: 40, right: 20, bottom: 40, left: 60 };

        const svg = d3.select('#conditionByAgeGroupChart')
            .html('')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const x = d3.scaleBand()
            .range([margin.left, width - margin.right])
            .domain(Object.keys(data.age_groups))
            .padding(0.2);

        const y = d3.scaleLinear()
            .range([height - margin.bottom, margin.top])
            .domain([0, d3.max(Object.values(data.age_groups))]);

        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y);

        svg.append('g')
            .attr('transform', `translate(0, ${height - margin.bottom})`)
            .call(xAxis)
            .append('text')
            .attr('x', width / 2)
            .attr('y', margin.bottom - 10)
            .attr('fill', 'black')
            .text('Age Group');

        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(yAxis)
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -margin.left + 20)
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .text('Count');

        svg.selectAll('rect')
            .data(Object.entries(data.age_groups))
            .enter()
            .append('rect')
            .attr('x', (d) => x(d[0]))
            .attr('y', (d) => y(d[1]))
            .attr('width', x.bandwidth())
            .attr('height', (d) => height - margin.bottom - y(d[1]))
            .attr('fill', '#69b3a2');

        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', margin.top - 10)
            .attr('text-anchor', 'middle')
            .text(`${data.condition} by Age Group`);
    }
});