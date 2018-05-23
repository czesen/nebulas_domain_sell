"use strict";

var DomainItem = function(text) {
	if (text) {
		var obj = JSON.parse(text);
		this.name = obj.name;    //域名名称
		this.price = obj.price;  //售价
		this.onwer = obj.onwer;  //持有人
		this.status = obj.status; //0 = 可购买 1 = 持有中（不可转让)
	} else {
	    this.name = "";
	    this.price = "";
	    this.onwer = "";
	    this.status = "";
	}
};

DomainItem.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var Domain = function () {
    LocalContractStorage.defineMapProperty(this, "repo", {
        parse: function (text) {
            return new DomainItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
};

Domain.prototype = {
    init: function () {
        // todo
    },
    //获取域名价格，单位NAS.
    getPrice:function(name)
    {
    		name = name.trim();
    		name = name.toUpperCase(); //转换成大写，因为域名对应大小写不敏感。
    		if(name === "")
    		{
    			throw new Error("empty name");
    		}
    		if(name.length > 256)
    		{
    			throw new Error("name exceed limit length")
    		}
    		
    		 var domainItem = this.repo.get(name);
    		 if(domainItem)
    		 {
    		 	if(domainItem.status==0)
    		 	{
    		 		var price = new BigNumber(domainItem.price); 
    		 		price = price.dividedBy(1000000000000000000); //转成NAS
    		 		return price;
    		 	}else if (domainItem.status == 1)
    		 	{
    		 		return -1;
    		 	}else
    		 	{
    		 		throw new Error("domain name status Illegal!");
    		 	}
    		 }else
    		 {
    		 	return 0.0001;
    		 }
    },
    //将域名标价并上架售卖转让。
    onSale:function(name,price){
    		name = name.trim();
    		name = name.toUpperCase();
    		price = price.trim();
    		if(name === "" || price === "")
    		{
    			throw new Error("empty name or price");
    		}
    		if(name.length > 256)
    		{
    			throw new Error("name exceed limit length")
    		}
    		
    		price = parseFloat(price);
    		if(price<=0)
    		{
    			throw new Error("price format Illegal!");
    		}
    	
    		var domainItem = this.repo.get(name);
    		if(!domainItem)
    		{
    			throw new Error("domain name Illegal!");
    		}
    		var from = Blockchain.transaction.from;
    		if(Blockchain.verifyAddress(from) && domainItem.onwer == from) //检测是否有权上架。
    		{
    			 price = new BigNumber(price * 1000000000000000000);//转为成WEI
    			 domainItem.status = 0;
    			 domainItem.price = price;
    			 this.repo.put(name, domainItem);
    			 return true;
    		}else
    		{
    			throw new Error("permission!");
    		}
    },
    
	//购买域名
    save: function (name) {
        name = name.trim();
        name = name.toUpperCase();
       
        if (name === "" ){
            throw new Error("empty name");
        }
        if (name.length > 256){
            throw new Error("name exceed limit length")
        }

        var from = Blockchain.transaction.from;
        var pay_price =  Blockchain.transaction.value;
        var need_price = this.getPrice(name); //NAS
        if(need_price<0)
    		{
    			throw new Error("this domain was private!");
    		}
    		
        need_price = new BigNumber(need_price * 1000000000000000000);
      
        var domainItem = this.repo.get(name);
        if (domainItem) //该域名已经有人持有。
        {
        		if(Blockchain.verifyAddress(from) && domainItem.onwer == from) //无法对自己的域名再次购买
        		{
        			throw new Error("you already have this domain !");
        		}
        		
        		if(domainItem.status == 1)
        		{
        			throw new Error("this domain not on sale!");
        		}
        	
            need_price = domainItem.price; //以卖家规定的价格为准。
            need_price = new BigNumber(need_price);
            
            if(pay_price.gte(need_price)) //支持的价格需要大于等于需要的价格。
            {
            		if(Blockchain.verifyAddress(domainItem.onwer) == 87) //验证用户钱包地址合法性。
            		{
            			 var result = Blockchain.transfer(domainItem.onwer, pay_price); //将支付的费用转给持有人。
            			 if(result)
            			 {
            			 	domainItem.onwer =  from; //变更所有权为付款人的。
            				domainItem.price = pay_price;
            				domainItem.status = 1;  //变成持有不能转让状态。
            				this.repo.put(name, domainItem);
            				return true;
            			 }else
            			 {
            			 	throw new Error("transfer fail!");
            			 }
            		}else
            		{
            			throw new Error("owner address Illegal!");
            		}
            }else
        		{
        			throw new Error("pay not enough!");
        		}
        }else
        {
        		//检查价格是否正确。
        		if(pay_price.gte(need_price))
        		{
        			domainItem = new DomainItem();
        			domainItem.onwer = from;
        			domainItem.name = name;
        			domainItem.price = pay_price;
        			domainItem.status = 1;
        			this.repo.put(name, domainItem);
        			return true;
        		}else
        		{
        			throw new Error("pay not enough!");
        		}	
        }
    },
	//获取域名信息。
    get: function (name) {
        name = name.trim();
        name = name.toUpperCase();
        if ( name === "" ) {
            throw new Error("empty name")
        }
        return this.repo.get(name);
    },
    //取出合约余额。（避免永远锁定在合约内）
    getByAdmin:function(price)
    {
    		price = price.trim();
    		if(price === "")
    		{
    			throw new Error("empty price");
    		}
    		
    		price = parseFloat(price);
    		if(price<=0)
    		{
    			throw new Error("price format Illegal!");
    		}
    		price = new BigNumber(price * 1000000000000000000);
    		
    		var from = Blockchain.transaction.from;
    		if(Blockchain.verifyAddress(from) && "n1TRLeEQT9oD6cEyXY8DuURYVbhetYgSxWn" == from)
    		{
    			var result = Blockchain.transfer(from, price);
    			if(result)
    			{
    				return true;
    			}else
    			{
    				throw new Error("transfer fail!");
    			}
    		}else
    		{
    			throw new Error("admin address Illegal!!");
    		} 	
    }
};
module.exports = Domain;
