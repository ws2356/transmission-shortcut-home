// main
document.addEventListener('DOMContentLoaded', optionsMain)

function optionsMain () {
  reloadApiList()
  document.getElementById('add-button')
    .addEventListener('click', handlePressAddBtn)
  document.getElementById('export-button')
    .addEventListener('click', handlePressExportBtn)
  document.getElementById('import-button')
    .addEventListener('click', handlePressImportBtn)
  document.getElementById(modalId)
    .addEventListener('click', hideModalOnClickBg)
  const { cancelBtn, submitBtn } = getModalElements()
  cancelBtn.addEventListener('click', handleCancel)
  submitBtn.addEventListener('click', handleSubmit)
  document.getElementById('apiList').addEventListener('change', handleSelectChange)
  window.addEventListener('click', (event) => {
    if (event.target.matches('.more')) { return }
    closePopMenu()
  })
}

// handlers
async function handlePressExportBtn (event) {
  const ele = event.target
  if (ele.matches('.disabled')) {
    return
  }
  const data = await getPersistData()
  const text = JSON.stringify(data, null, 4)
  const url = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`
  const filename = `${chrome.runtime.getManifest().name}.txt`
  chrome.downloads.download({ url, filename, saveAs: true })
}
async function handlePressImportBtn (event) {
  const fileInput =  document.getElementById('file-chooser-input')
  const handleFileInput = async function () {
    const fileInput =  document.getElementById('file-chooser-input')
    fileInput.removeEventListener('change', handleFileInput)
    if (!fileInput.files || !fileInput.files[0]) { return }
    const text = await fileInput.files[0].text()
    try {
      const { remoteList, localList, selected } = JSON.parse(text) || {}
      await setPersistData(remoteList || [], localList || [], selected)
      await reloadApiList()
    } catch (e) {
      console.error(`file input failed: ${e}`)
    }
  }
  fileInput.addEventListener('change', handleFileInput)
  fileInput.click()
}
function handlePressAddBtn(event) {
  const title = '添加Transmission daemon api'
  const promptText = '输入api地址'
  const placeholder = 'e.g. http://your.domain/transmission/rpc'
  const { heading, prompt, input, struts } = getModalElements()
  heading.textContent = title
  prompt.textContent = promptText
  input.placeholder = placeholder
  input.value = ''
  if (struts && struts[0]) {
    struts[0].textContent = promptText
  }
  if (struts && struts[1]) {
    struts[1].textContent = placeholder
  }
  const modal = showModal()
  modal.dataset.type = 'add'
}
function handlePressMoreBtn(event) {
  const popMenu = getPopMenu()
  popMenu.style.display = 'block'
  let itemNode = event.target
  while (itemNode && !itemNode.matches('div.item')) {
    itemNode = itemNode.parentNode
  }
  if (!itemNode) { return }
  itemNode.append(popMenu)
  const apiToDelete = itemNode.querySelector('input.radio').value
  const deleteBtn = popMenu.querySelector('.delete')
  const handleDelete = async function () {
    await reqDeleteApi(apiToDelete)
    await reloadApiList()
    deleteBtn.removeEventListener('click', handleDelete)
    closePopMenu()
  }
  deleteBtn.addEventListener('click', handleDelete)
}
async function handleSubmit (event) {
  const { input } = getModalElements()
  const api = input.value.trim()
  if (!api) { return }
  if (modal.dataset.type !== 'add') { return }
  await reqAddApi(api)
  await reloadApiList()
  hideModal()
}
function handleCancel (event) {
  hideModal()
}
async function handleSelectChange (event) {
  if (!event.target.matches('input[name=api]')) { return }
  let api = event.target.value
  if (!api) { return }
  await reqSelectApi(api)
  await reloadApiList()
}

// api
async function reqAddApi(api) {
  let { remoteList, localList, selected } = await getPersistData()
  if (!remoteList.includes(api)) {
    remoteList.push(api)
  }
  if (!localList.includes(api)) {
    localList.push(api)
  }
  if (!selected) {
    selected = api
  }
  await setPersistData(remoteList, localList, selected)
}
async function reqDeleteApi (api) {
  let { remoteList, localList, selected } = await getPersistData()
  const nextRemoteList = remoteList.filter(item => item !== api)
  const nextlocalList = localList.filter(item => item !== api)
  const nextSelected = selected === api ? '' : selected
  await setPersistData(nextRemoteList, nextlocalList, nextSelected)
}

// render logic
async function reloadApiList() {
  const { remoteList: apiList, localList, selected } = await getPersistData()
  for (let item of localList) {
    if (apiList.includes(item)) { continue }
    apiList.push(item)
  }
  const itemParent = getItemParent()
  const itemNodes = getItemNodes()
  const nextItemNodes = []
  console.log(`apiList: ${apiList}, selected: ${selected}`)
  for (let [idx, api] of apiList.entries()) {
    let node
    if (idx < itemNodes.length) {
      node = itemNodes[idx]
    } else {
      node = createApiItemNode()
    }
    configApiItemNode(node, idx, api, api === selected)
    nextItemNodes.push(node)
  }
  if (apiList.length <= itemNodes.length) {
    for (let ii = apiList.length; ii < itemNodes.length; ++ii) {
      itemNodes[ii].remove()
    }
  } else {
    itemParent.append(...nextItemNodes.slice(itemNodes.length))
  }

  let headingText = ''
  if (!apiList.length && !selected) {
    headingText = '未添加Transmission daemon'
  } else if (!selected) {
    headingText = '未选择Transmission daemon'
  } else {
    headingText = `已选择：${selected}`
  }
  const headingNode = document.querySelector('body #heading')
  if (selected) {
    headingNode.classList.remove('warn')
  } else {
    headingNode.classList.add('warn')
  }
  headingNode.textContent = headingText

  const exportBtn = document.getElementById('export-button')
  if (apiList.length) {
    exportBtn.classList.remove('disabled')
  } else {
    exportBtn.classList.add('disabled')
  }
  await updateTooltip()
}

function createApiItemNode () {
  const itemNode = document.createElement('div')
  itemNode.classList.add('item')
  const radio = document.createElement('input')
  radio.name = 'api'
  radio.classList.add('radio')
  radio.type = 'radio'
  const label = document.createElement('label')
  label.classList.add('label')
  const more = document.createElement('div')
  more.classList.add('more')
  more.addEventListener('click', handlePressMoreBtn)
  itemNode.append(radio, label, more)
  return itemNode
}
function configApiItemNode (itemNode, idx, api, selected) {
  const radio = itemNode.querySelector('input[type=radio]')
  radio.value = api
  radio.id = `item-${idx}`
  radio.checked = selected
  const label = itemNode.querySelector('label.label')
  label.textContent = api
  label.htmlFor = radio.id
}

// modal
const modalId = 'modal'
function hideModal() {
  const ele = document.getElementById(modalId)
  ele.style.display = 'none'
}
function hideModalOnClickBg(event) {
  const ele = document.getElementById(modalId)
  if (event && event.target !== ele) {
    return
  }
  ele.style.display = 'none'
  return ele
}
function showModal() {
  const ele = document.getElementById(modalId)
  ele.style.display = 'flex'
  return ele
}

// pop-menu
let popMenu = null
function getPopMenu() {
  if (!popMenu) {
    popMenu = document.querySelector('body #pop-menu')
  }
  return popMenu
}
function closePopMenu() {
  getPopMenu().style.display = 'none'
}

// dom
function getModalElements() {
  const modal = document.getElementById('modal')
  const modalContent = modal.querySelector('div.modal-content')
  const heading = modalContent.querySelector('div.title')
  const inputParagraph = modalContent.querySelector('div.input')
  const prompt = inputParagraph.querySelector('div>label[for=modal-api-input]')
  const input = inputParagraph.querySelector('div>input#modal-api-input')
  const struts = inputParagraph.querySelectorAll('div.strut')
  const btnMenu = modalContent.querySelector('div.btn-menu')
  const cancelBtn = btnMenu.querySelector('input.cancel')
  const submitBtn = btnMenu.querySelector('input.submit')
  return { modalContent, heading, input, cancelBtn, submitBtn, prompt, struts }
}
function getForm () {
  return document.querySelector('body form#apiList')
}
function getItemParent () {
  return getForm().querySelector('fieldset')
}
function getItemNodes () {
  return getItemParent().querySelectorAll('div.item')
}
function getItemRadio (itemNode) {
  if (!itemNode) { return nil }
  return itemNode.querySelectorAll('input.radio')
}
