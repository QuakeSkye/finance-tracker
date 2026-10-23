const { chromium } = require('playwright')
const assert = require('node:assert/strict')
;(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true})
 try {
  const page=await browser.newPage()
  let config={enabled:false,base_url:'http://127.0.0.1:11434',model:'glm-ocr',timeout_seconds:120,num_ctx:16384}, selection='deepseek', previews=0
  const user=()=>({id:1,display_name:'测试用户',enabled:true,token_prefix:'masked',image_provider:selection,credential:{configured:true,masked:'***'}})
  await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname, method=route.request().method()
   let data={}
   if(path.endsWith('/auth/me'))data={id:1,username:'admin'}
   else if(path==='/api/v1/settings/local-engine') { if(method==='PUT')config=route.request().postDataJSON();data=config }
   else if(path==='/api/v1/settings')data={model:'test',upload_max_size_bytes:10485760}
   else if(path==='/api/v1/ledger-users')data={items:[user()]}
   else if(path.endsWith('/image-engine/preview')){previews++;data={success:false,preview:true,record_id:null,message:'本地模型未输出结构化账单字段',error_code:'LOCAL_BILL_SCHEMA_INVALID'}}
   else if(path.endsWith('/image-engine')){selection=route.request().postDataJSON().provider;data={provider:selection}}
   await route.fulfill({json:data})
  })
  await page.goto('http://127.0.0.1:5173/settings')
  await page.getByRole('button',{name:'保存本地引擎配置',exact:true}).waitFor()
  await page.locator('.el-switch__core').click()
  await page.getByRole('button',{name:'保存本地引擎配置',exact:true}).click()
  await page.getByText('Ollama 配置已保存，按用户选择后生效',{exact:true}).waitFor()
  assert.equal(config.enabled,true)
  await page.getByLabel('测试账单图片').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('fake-test-image')})
  await page.getByRole('button',{name:'仅测试，不入账',exact:true}).click()
  await page.locator('.el-alert').filter({hasText:'本地模型未输出结构化账单字段'}).waitFor()
  assert.equal(previews,1)
  await page.goto('http://127.0.0.1:5173/users')
  await page.locator('.el-select__wrapper').click()
  await page.getByRole('option',{name:'本地 Ollama',exact:true}).click()
  await page.getByText('此用户的识别引擎已切换',{exact:true}).waitFor()
  assert.equal(selection,'local_ollama')
  console.log('PASS: config, toggle, no-posting preview and user engine switching')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
