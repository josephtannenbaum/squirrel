import * as messaging from "messaging";

function minutesFormat(m) {
  // translates integer 125 => string "2h5m"
  const hourPart = Math.floor(m / 60) ? Math.floor(m / 60) + 'h' : '';
  const minutePart = m % 60 ? (m % 60) + 'm' : '';
  return hourPart + minutePart;
}

function mySettings(props) {
  const MAX_MINUTES = 30;
  const MAX_TASKS = 30;
  const TASK_ICON = "https://svgur.com/i/ECj.svg";
  
  const taskTotal = () => {
    let total = 0; 
    for(var key of Object.keys(props.settings)) {
      if (key.startsWith('dur_'))
      total += parseInt(props.settings[key]);
    } 
    return minutesFormat(total)
  }
  props.taskTotalTime = taskTotal();
  
  return (
    <Page>
      <Section
        title={<Text bold align="center">Tasks</Text>}>
        <AdditiveList
          settingsKey="tasklist"
          maxItems={MAX_TASKS}
          renderItem={
            ({ name, value }) => 
            <Section>
              <TextImageRow
                label={name}
                icon={TASK_ICON}
              />
              <Select
                label="Minutes"
                selectViewTitle="Duration in minutes"
                settingsKey={'dur_'+name}
                options={(() => {
                  let opts = []; 
                  let i = 1; 
                  while(i < MAX_MINUTES + 1) {
                    opts.push({name: i});
                    i++;
                  } 
                  return opts;
                })()}
              />
            </Section>
          }
          onListChange={() => {
            props.taskTotalTime = taskTotal();
          }}
        />
        
        <TextImageRow
          label={props.taskTotalTime}
          sublabel="minutes total"
        />
        
      </Section>
    </Page>
  );
}

registerSettingsPage(mySettings);
