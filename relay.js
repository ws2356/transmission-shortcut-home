function handleClick(event) {
  console.log(`currentTarget: ${event.currentTarget}`)
  console.log(event.eventPhase);
  event.preventDefault();
  event.stopImmediatePropagation();
  alert('a clicked at phase: ' + event.eventPhase);
}

var ele = document.getElementById('testa');
ele.addEventListener('click', handleClick);

var ele0 = document.getElementById('wrapper');
ele0.addEventListener('click', function(event) {
  console.log('wrapper clicked at phase: ' + event.eventPhase);
});

window.addEventListener('message', function(event) {
	function callback(resp) {
		if (event.source && typeof event.source.postMessage) {
			event.source.postMessage({ type: 'batchAddResp', data: resp }, '*');
		}
	}

  var data = event.data;
  if (!data || data.type != 'batchAdd' || !data.payload || !data.payload.length || !data.extId) {
	  callback(false);
    return;
  }
  if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
	  callback(false);
    return;
  }

  var payload = { type: 'batchAdd', urls: data.payload };
  chrome.runtime.sendMessage(data.extId, payload, function(resp) {
    console.log(`chrome.runtime.sendMessage callback: ${resp}`)
	  callback(resp);
  });
});
