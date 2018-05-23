 var dappAddress = "n1iFWMv9E2kakKeWnpGXH3vzq68xVQGrtJq"; //合约地址
 var nebulas = require("nebulas"),
 	Account = nebulas.Account,
 	neb = new nebulas.Neb();
 neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));
 var NebPay = require("nebpay");
 var nebPay = new NebPay();
 var layer_html;
 var intervalQuery;
 var myAddress = null;

 $(function() {
 	checkWallet();

 	$("#search").click(function() {
 		searchDomain();
 	});
 });
 
 function checkWallet()
 {
 	if(typeof(webExtensionWallet) === "undefined") {
 		layer.msg(
		'检测到星云钱包插件未安装！您无法进行交易!', {
			time: 10000, //10s后自动关闭
			btn: ['立刻安装', '我就看看'],
			yes: function(index) {
				window.open("https://github.com/ChengOrangeJu/WebExtensionWallet");     
				layer.close(index);
			},
			btn2: function(index) {
				layer.close(index);
			}
		});
		return false;
 	}
 	return true;
 }

 function onSaleDomain() {
 	if(!checkWallet())//没有钱包插件无法继续执行。
 	{
 		return;
 	}

 	layer.prompt({
 		title: '输入转账价格。（单位NAS)',
 		formType: 0
 	}, function(price, index) {
 		if(price > 0) {
 			layer.close(index);
 			layer.msg('友情提示，请使用该域名所有权的地址钱包进行转账确认！');
 			var serialNumber
 			var to = dappAddress;
 			var value = 0;
 			var name = $("#detail_name").html();
 			name = name.toUpperCase(); //转成大写，因为域名对大小写不敏感。
 			//console.log('price:' + value);
 			var callFunction = "onSale"
 			var callArgs = "[\"" + name + "\",\"" + price + "\"]"

 			serialNumber = nebPay.call(to, value, callFunction, callArgs, {
 				callback: 'https://pay.nebulas.io/api/pay',
 				listener: cbPush //设置listener, 处理交易返回信息
 			});

 			intervalQuery = setInterval(function() {
 				funcIntervalQuery(serialNumber, 'onSale');
 			}, 12000);

 		} else {
 			layer.msg('输入格式错误！');
 		}
 	});

 }

 function searchDomain() {
 	var name = $("#name").val();
 	var prefix = $('#prefix option:selected').text();
 	var domain_name = name + prefix;
 	console.log(domain_name);

 	var from = Account.NewAccount().getAddressString();
 	var value = "0";
 	var nonce = "0"
 	var gas_price = "1000000"
 	var gas_limit = "2000000"
 	var callFunction = "get";
 	var callArgs = "[\"" + domain_name + "\"]"; //in the form of ["args"]
 	var contract = {
 		"function": callFunction,
 		"args": callArgs
 	}
 	layer.load(1, {
 		shade: [0.3, '#fff'] //0.1透明度的白色背景
 	});

 	neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function(resp) {
 		cbSearch(resp)
 	}).catch(function(err) {
 		//cbSearch(err)
 		console.log("error:" + err.message)
 	})
 }

 function clearDetail() {
 	$("#detail_name").html('');
 	$("#detail_name").show();
 	$("#detail_price").html('');
 	$("#detail_price").show();
 	$("#detail_onwer").html('');
 	$("#detail_onwer").show('');
 	$("#detail_status").html('');
 	$("#detail_status").show();
 	$("#buy").show();
 	$("#onsale").hide();

 }

 function openDialog() {
 	layer.open({
 		type: 1,
 		title: false,
 		//skin: 'layui-layer-rim', //加上边框
 		area: ['500px'],
 		closeBtn: 1,
 		content: layer_html,
 		end: function() {
 			$('#small-dialog').html(layer_html);
 		}
 	});

 	$("#buy").click(function() {
 		var name = $("#detail_name").html();
 		var price = $("#detail_price").html();

 		buyDomain(name, price);
 	});
 }

 function cbSearch(resp) {
 	var result = resp.result ////resp is an object, resp.result is a JSON string
 	//console.log("return of rpc call: " + JSON.stringify(result));
 	layer.closeAll();
 	if(result === 'null') //该域名还未出售
 	{
 		$("#buy").show();
 		//获取初始价格。
 		getDomainPrice();
 	} else {

 		result = JSON.parse(result);
 		console.log(result);
 		clearDetail();
 		$("#detail_name").html(result.name);
 		result.price = result.price / 1000000000000000000;
 		$("#detail_price").html(result.price);
 		$("#detail_onwer").html(result.onwer);

 		if(result.status == 1) //该域名有人持有中,未出售。
 		{
 			$("#buy").hide();
 			if(myAddress == result.onwer) //当链上持有人地址与交易成功的地址一致时，才显示转让按钮。
 			{
 				$("#onsale").html('我要转让')
 				$("#onsale").show();
 			}

 			$("#detail_status").html('持有中');
 		} else {
 			if(myAddress == result.onwer) {
 				$("#buy").hide();
 				$("#onsale").html('修改价格');
 				$("#onsale").show();
 			}
 			$("#detail_status").html('转让中');
 		}
 		layer_html = $("#small-dialog").html();
 		$('#small-dialog').html('');
 		openDialog();
 	}
 };

 function cbPriceSearch(resp) {
 	var result = resp.result ////resp is an object, resp.result is a JSON string
 	console.log("return of rpc call: " + JSON.stringify(result));
 	var name = $("#name").val();
 	var prefix = $('#prefix option:selected').text();
 	var domain_name = name + prefix;
 	clearDetail();
 	$("#detail_name").html(domain_name);
 	//result = result/1000000000000000000;
 	$("#detail_price").html(result);
 	$("#detail_onwer").html('无人持有！');
 	$("#detail_status").html('可购买');
 	layer_html = $("#small-dialog").html();
 	$('#small-dialog').html('');
 	openDialog();

 }

 function getDomainPrice() {
 	var name = $("#name").val();
 	var prefix = $('#prefix option:selected').text()
 	var domain_name = name + prefix;
 	var from = Account.NewAccount().getAddressString();
 	var value = "0";
 	var nonce = "0"
 	var gas_price = "1000000"
 	var gas_limit = "2000000"
 	var callFunction = "getPrice";
 	var callArgs = "[\"" + domain_name + "\"]"; //in the form of ["args"]
 	var contract = {
 		"function": callFunction,
 		"args": callArgs
 	}

 	neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function(resp) {
 		cbPriceSearch(resp)
 	}).catch(function(err) {
 		//cbSearch(err)
 		console.log("error:" + err.message)
 	})
 }

 function buyDomain(name, price) {
 	if(!checkWallet())//没有钱包插件无法继续执行。
 	{
 		return;
 	}
 	
 	var serialNumber
 	var to = dappAddress;
 	var value = price;
 	name = name.toUpperCase(); //转成大写，因为域名对大小写不敏感。
 	//console.log('price:' + value);
 	var callFunction = "save"
 	var callArgs = "[\"" + name + "\"]";

 	serialNumber = nebPay.call(to, value, callFunction, callArgs, {
 		callback: 'https://pay.nebulas.io/api/pay',
 		listener: cbPush //设置listener, 处理交易返回信息
 	});

 	intervalQuery = setInterval(function() {
 		funcIntervalQuery(serialNumber, 'save');
 	}, 12000);
 }

 function funcIntervalQuery(serialNumber, bizType) {
 	nebPay.queryPayInfo(serialNumber) //search transaction result from server (result upload to server by app)
 		.then(function(resp) {
 			console.log("tx result: " + resp) //resp is a JSON string
 			var respObject = JSON.parse(resp)
 			if(respObject.code === 0 && respObject.data.status === 1) {
 				myAddress = respObject.data.from; //交易成果，确认钱包地址。
 				clearInterval(intervalQuery);
 				layer.closeAll('loading');
 				$('#small-dialog').html(layer_html);
 				if(bizType == 'save') {
 					layer.msg('交易成功！您拥有了该域名！');
 				} else if(bizType == 'onSale') {
 					layer.msg('您已成功将域名修改为转让状态！');
 				}

 				setTimeout(function() {
 					searchDomain();
 				}, 2000);
 			} else if(respObject.code === 0 && respObject.data.status === 0) {
 				clearInterval(intervalQuery);
 				layer.closeAll('loading');
 				$('#small-dialog').html(layer_html);
 				if(bizType == 'save') {
 					layer.msg('交易失败！');
 				} else if(bizType == 'onSale') {
 					layer.msg('修改状态失败！');
 				}
 			}
 		})
 		.catch(function(err) {
 			console.log(err);
 		});
 }

 function cbPush(resp) {
 	console.log("response of push: " + JSON.stringify(resp))
 	layer.load(1, {
 		shade: [0.3, '#fff']
 	});
 }