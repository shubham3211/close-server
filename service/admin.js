var admin = {
	fetchorders : function (req,res) {
		var workflow = req.app.utility.workflow(req, res);
		req.app.db.models.Order.find({/*status:"Active"*/},function (err,orders) {
			if (err){
				return workflow.emit('exception',err)
			}
			workflow.outcome.order = orders
			workflow.emit('response')
		}).populate('cart','id skuid category subcategory size name mrp sellingpriceimageurl bulkdiscount quantity')
		.populate({path:"userid", populate:{path:"addressbook"}})
		.populate('deliveryaddress')
	},
	fetchorderdetail:function (req,res) {
		var workflow = req.app.utility.workflow(req, res);
		console.log(req.query.orderid)
		req.app.db.models.Order.findById(req.query.orderid,function (err,orders) {
			if (err){
				return workflow.emit('exception',err)
			}
			console.log(orders)
			workflow.outcome.order = orders
			workflow.emit('response')
		}).populate('cart.sku','id skuid category subcategory size name mrp sellingpriceimageurl bulkdiscount')
		.populate({path:"userid", populate:{path:"addressbook"}})
		.populate('deliveryaddress')
	},
	test:function (req,res) {
		var jobwork = (req.body);
		console.log(jobwork)
		var newaddress = {}
		//console.log(jobwork)
		//console.log(JSON.parse(req.body.jobwork))
		var workflow = req.app.utility.workflow(req, res);
		workflow.on('checkupdateaddress',function () {
			console.log(jobwork.update)
			if (jobwork.update === 'false'){
				//newaddress = jobwork.a
				return workflow.emit('updateorderwithoutaddress')
				
				
			}
			else{
				console.log('lalaa')
				return workflow.emit('createuseraddress')
				
			}
		})

		workflow.on('createuseraddress',function () {
			console.log(jobwork.address)
			console.log(JSON.parse(jobwork.address))
			req.app.db.models.AddressBook.create(JSON.parse(jobwork.address),function (err,ab) {
				if (err){
					return workflow.emit('exception',err)
				}
				console.log('im heee')
				workflow.ab = ab;
				console.log(workflow.ab.id)
				workflow.emit('updateaccount')
			})
		})
		workflow.on('updateaccount',function () {
			console.log(jobwork.userid)
			req.app.db.models.Account.findByIdAndUpdate(jobwork.userid,{$push:{addressbook:workflow.ab.id}},function (err,account) {
				if (err){
					return workflow.emit('exception',err)
				}
				console.log('im heeeasasa')
				workflow.emit('updateorderbyaddress')
			})
		})

		workflow.on('updateorderbyaddress',function () {
			req.app.db.models.Order.findByIdAndUpdate(jobwork.orderid,{deliveryaddress:workflow.ab.id,status:jobwork.status,specialinstruction:jobwork.specialinstruction},function (err,order) {
				if (err){
					return workflow.emit('exception',err)
				}
				
				workflow.emit('response')
			})
		})
		workflow.on('updateorderwithoutaddress',function () {
			req.app.db.models.Order.findByIdAndUpdate(jobwork.orderid,{status:jobwork.status,specialinstruction:jobwork.specialinstruction},function (err,order) {
				if (err){
					return workflow.emit('exception',err)
				}
				workflow.emit('response')
			})
		})

		workflow.emit('checkupdateaddress')
		
	}
	
}
module.exports = admin;